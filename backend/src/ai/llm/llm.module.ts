import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from '../../config/env.schema.js';
import { AnthropicAdapter } from './anthropic.adapter.js';
import { LLM_CLIENT, type LlmClient } from './llm-client.port.js';
import { NoneAdapter } from './none.adapter.js';
import { OpenAiAdapter } from './openai.adapter.js';

const logger = new Logger('LlmModule');

function resolveProvider(config: ConfigService<AppEnv, true>): LlmClient {
  const configured = config.get('LLM_PROVIDER', { infer: true });
  const anthropicKey = config.get('ANTHROPIC_API_KEY', { infer: true });
  const openaiKey = config.get('OPENAI_API_KEY', { infer: true });
  const timeoutMs = config.get('LLM_TIMEOUT_MS', { infer: true });

  const provider =
    configured === 'auto' ? (anthropicKey ? 'anthropic' : openaiKey ? 'openai' : 'none') : configured;

  if (provider === 'anthropic') {
    if (!anthropicKey) {
      logger.warn('LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set; running rules-only.');
      return new NoneAdapter();
    }
    const model = config.get('ANTHROPIC_MODEL', { infer: true });
    logger.log(`AI layer: Anthropic (${model})`);
    return new AnthropicAdapter(anthropicKey, model, timeoutMs);
  }

  if (provider === 'openai') {
    if (!openaiKey) {
      logger.warn('LLM_PROVIDER=openai but OPENAI_API_KEY is not set; running rules-only.');
      return new NoneAdapter();
    }
    const model = config.get('OPENAI_MODEL', { infer: true });
    logger.log(`AI layer: OpenAI (${model})`);
    return new OpenAiAdapter(openaiKey, model, timeoutMs);
  }

  logger.warn('No LLM provider configured; running rules-only (heuristic extraction, template replies).');
  return new NoneAdapter();
}

@Module({
  providers: [
    {
      provide: LLM_CLIENT,
      useFactory: resolveProvider,
      inject: [ConfigService],
    },
  ],
  exports: [LLM_CLIENT],
})
export class LlmModule {}
