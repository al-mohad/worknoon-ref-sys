import { Injectable } from '@nestjs/common';
import {
  LlmUnavailableError,
  type CompletionRequest,
  type LlmClient,
  type LlmResult,
  type ToolCallRequest,
} from './llm-client.port.js';

/**
 * Used when no provider key is configured. Every call fails immediately
 * with the same error the real adapters raise on an outage, so the rest
 * of the app takes the one fallback path whether the model is down or was
 * never configured.
 */
@Injectable()
export class NoneAdapter implements LlmClient {
  readonly provider = 'anthropic' as const;
  readonly model = 'none';

  async callTool<T>(_request: ToolCallRequest<T>): Promise<LlmResult<T>> {
    throw new LlmUnavailableError('No LLM provider is configured');
  }

  async complete(_request: CompletionRequest): Promise<LlmResult<string>> {
    throw new LlmUnavailableError('No LLM provider is configured');
  }
}
