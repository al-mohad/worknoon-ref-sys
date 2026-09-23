import type { z } from 'zod';

/**
 * Everything outside the `ai/llm` adapters talks to this interface only -
 * no Anthropic or OpenAI SDK types leak past it. See docs/design.md
 * section 6.
 */
export interface LlmClient {
  readonly provider: 'anthropic' | 'openai';
  readonly model: string;

  callTool<T>(request: ToolCallRequest<T>): Promise<LlmResult<T>>;
  complete(request: CompletionRequest): Promise<LlmResult<string>>;
}

export interface ToolCallRequest<T> {
  system: string;
  input: string;
  tool: { name: string; description: string; schema: z.ZodType<T> };
  maxOutputTokens: number;
}

export interface CompletionRequest {
  system: string;
  input: string;
  maxOutputTokens: number;
}

export interface LlmResult<T> {
  value: T;
  latencyMs: number;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}

/** Network error, timeout, rate limit, server error, or a refusal that survived any fallback. */
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

/** The model responded, but didn't call the tool, or its output failed schema validation. */
export class LlmOutputError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmOutputError';
  }
}

export const LLM_CLIENT = Symbol('LLM_CLIENT');
