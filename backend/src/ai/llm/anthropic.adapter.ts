import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import {
  LlmOutputError,
  LlmUnavailableError,
  type CompletionRequest,
  type LlmClient,
  type LlmResult,
  type ToolCallRequest,
} from './llm-client.port.js';
import { toToolSchema } from './tool-schema.js';

const TOOL_CALL_BETAS = ['server-side-fallback-2026-07-01'] as const;

@Injectable()
export class AnthropicAdapter implements LlmClient {
  readonly provider = 'anthropic' as const;
  private readonly logger = new Logger(AnthropicAdapter.name);
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
    private readonly timeoutMs: number,
  ) {
    this.client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 2 });
  }

  async callTool<T>(request: ToolCallRequest<T>): Promise<LlmResult<T>> {
    const started = Date.now();
    let response: Anthropic.Beta.Messages.BetaMessage;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: request.maxOutputTokens,
        betas: [...TOOL_CALL_BETAS],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
        tools: [
          {
            name: request.tool.name,
            description: request.tool.description,
            input_schema: toToolSchema(request.tool.schema) as Anthropic.Beta.Messages.BetaTool.InputSchema,
            strict: true,
          },
        ],
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        messages: [{ role: 'user', content: request.input }],
      });
    } catch (error) {
      throw new LlmUnavailableError('Anthropic tool call failed', error);
    }

    const latencyMs = Date.now() - started;
    const usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    };

    if (response.stop_reason === 'refusal') {
      throw new LlmUnavailableError('Anthropic refused the request after the fallback chain');
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.Beta.Messages.BetaToolUseBlock => block.type === 'tool_use',
    );
    if (!toolUse) {
      throw new LlmOutputError('Anthropic did not call the expected tool');
    }

    const parsed = request.tool.schema.safeParse(toolUse.input);
    if (!parsed.success) {
      throw new LlmOutputError(
        `Anthropic tool call failed schema validation: ${z.prettifyError(parsed.error)}`,
        parsed.error,
      );
    }

    return { value: parsed.data, latencyMs, usage };
  }

  async complete(request: CompletionRequest): Promise<LlmResult<string>> {
    const started = Date.now();
    let response: Anthropic.Beta.Messages.BetaMessage;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: request.maxOutputTokens,
        betas: [...TOOL_CALL_BETAS],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: request.input }],
      });
    } catch (error) {
      throw new LlmUnavailableError('Anthropic completion failed', error);
    }

    const latencyMs = Date.now() - started;
    const usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    };

    if (response.stop_reason === 'refusal') {
      throw new LlmUnavailableError('Anthropic refused the request after the fallback chain');
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === 'text',
    );
    if (!textBlock) {
      throw new LlmOutputError('Anthropic returned no text content');
    }

    return { value: textBlock.text, latencyMs, usage };
  }
}
