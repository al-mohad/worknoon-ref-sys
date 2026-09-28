import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../config/env.schema.js';
import { AiStatusService } from './ai-status.service.js';
import { AnthropicAdapter } from './anthropic.adapter.js';
import { LLM_CLIENT, type LlmClient } from './llm-client.port.js';
import { MonitoredLlmClient } from './monitored-llm-client.js';
import { NoneAdapter } from './none.adapter.js';
import { OpenAiAdapter } from './openai.adapter.js';

const logger = new Logger('LlmModule');

function rulesOnly(status: AiStatusService): LlmClient {
  status.configure(null, null);
  return new NoneAdapter();
}

function monitored(adapter: LlmClient, status: AiStatusService): LlmClient {
  status.configure(adapter.provider, adapter.model);
  return new MonitoredLlmClient(adapter, status);
}

function resolveProvider(config: ConfigService<AppEnv, true>, status: AiStatusService): LlmClient {
  const configured = config.get('LLM_PROVIDER', { infer: true });
  const anthropicKey = config.get('ANTHROPIC_API_KEY', { infer: true });
  const openaiKey = config.get('OPENAI_API_KEY', { infer: true });
  const timeoutMs = config.get('LLM_TIMEOUT_MS', { infer: true });

  const provider =
    configured === 'auto' ? (anthropicKey ? 'anthropic' : openaiKey ? 'openai' : 'none') : configured;

  if (provider === 'anthropic') {
    if (!anthropicKey) {
      logger.warn('LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set; running rules-only.');
      return rulesOnly(status);
    }
    const model = config.get('ANTHROPIC_MODEL', { infer: true });
    logger.log(`AI layer: Anthropic (${model})`);
    return monitored(new AnthropicAdapter(anthropicKey, model, timeoutMs), status);
  }

  if (provider === 'openai') {
    if (!openaiKey) {
      logger.warn('LLM_PROVIDER=openai but OPENAI_API_KEY is not set; running rules-only.');
      return rulesOnly(status);
    }
    const model = config.get('OPENAI_MODEL', { infer: true });
    logger.log(`AI layer: OpenAI (${model})`);
    return monitored(new OpenAiAdapter(openaiKey, model, timeoutMs), status);
  }

  logger.warn('No LLM provider configured; running rules-only (heuristic extraction, template replies).');
  return rulesOnly(status);
}

@Module({
  providers: [
    AiStatusService,
    {
      provide: LLM_CLIENT,
      useFactory: resolveProvider,
      inject: [ConfigService, AiStatusService],
    },
  ],
  exports: [LLM_CLIENT, AiStatusService],
})
export class LlmModule {}
