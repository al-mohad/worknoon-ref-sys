import type { AiStatusService } from './ai-status.service.js';
import {
  LlmOutputError,
  LlmUnavailableError,
  type CompletionRequest,
  type LlmClient,
  type LlmResult,
  type ToolCallRequest,
} from './llm-client.port.js';

/**
 * Wraps a real adapter and reports each call's outcome to AiStatusService.
 * Only an unavailable provider counts as a failure: a malformed tool call
 * means the provider answered, so it doesn't make the AI layer "offline".
 */
export class MonitoredLlmClient implements LlmClient {
  constructor(
    private readonly inner: LlmClient,
    private readonly status: AiStatusService,
  ) {}

  get provider() {
    return this.inner.provider;
  }

  get model() {
    return this.inner.model;
  }

  callTool<T>(request: ToolCallRequest<T>): Promise<LlmResult<T>> {
    return this.track(() => this.inner.callTool(request));
  }

  complete(request: CompletionRequest): Promise<LlmResult<string>> {
    return this.track(() => this.inner.complete(request));
  }

  private async track<R>(call: () => Promise<R>): Promise<R> {
    try {
      const result = await call();
      this.status.recordSuccess();
      return result;
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        this.status.recordFailure();
      } else if (error instanceof LlmOutputError) {
        this.status.recordSuccess();
      }
      throw error;
    }
  }
}
