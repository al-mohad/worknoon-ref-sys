import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
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

@Injectable()
export class OpenAiAdapter implements LlmClient {
  readonly provider = 'openai' as const;
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    readonly model: string,
    timeoutMs: number,
  ) {
    this.client = new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 2 });
  }

  async callTool<T>(request: ToolCallRequest<T>): Promise<LlmResult<T>> {
    const started = Date.now();
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: request.maxOutputTokens,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.input },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: request.tool.name,
              description: request.tool.description,
              parameters: toToolSchema(request.tool.schema),
              strict: true,
            },
          },
        ],
        tool_choice: 'auto',
        parallel_tool_calls: false,
      });
    } catch (error) {
      throw new LlmUnavailableError('OpenAI tool call failed', error);
    }

    const latencyMs = Date.now() - started;
    const usage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      cacheReadTokens: response.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    };

    const toolCall = response.choices[0]?.message.tool_calls?.[0];
    if (!toolCall || toolCall.type !== 'function') {
      throw new LlmOutputError('OpenAI did not call the expected tool');
    }

    let rawArgs: unknown;
    try {
      rawArgs = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      throw new LlmOutputError('OpenAI tool call arguments were not valid JSON', error);
    }

    const parsed = request.tool.schema.safeParse(rawArgs);
    if (!parsed.success) {
      throw new LlmOutputError(
        `OpenAI tool call failed schema validation: ${z.prettifyError(parsed.error)}`,
        parsed.error,
      );
    }

    return { value: parsed.data, latencyMs, usage };
  }

  async complete(request: CompletionRequest): Promise<LlmResult<string>> {
    const started = Date.now();
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: request.maxOutputTokens,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.input },
        ],
      });
    } catch (error) {
      throw new LlmUnavailableError('OpenAI completion failed', error);
    }

    const latencyMs = Date.now() - started;
    const usage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      cacheReadTokens: response.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    };

    const text = response.choices[0]?.message.content;
    if (!text) {
      throw new LlmOutputError('OpenAI returned no text content');
    }

    return { value: text, latencyMs, usage };
  }
}
