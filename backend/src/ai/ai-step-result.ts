/** What every AI step reports back, regardless of whether it used the model or a fallback. */
export interface AiStepResult<T> {
  value: T;
  step: string;
  provider: 'anthropic' | 'openai' | 'heuristic';
  model?: string;
  status: 'ok' | 'fallback' | 'error';
  usedFallback: boolean;
  latencyMs: number;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
}
