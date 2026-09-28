import { Injectable } from '@nestjs/common';

export type AiMode = 'live' | 'degraded' | 'rules_only';

export interface AiStatusSnapshot {
  mode: AiMode;
  provider: 'anthropic' | 'openai' | null;
  model: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

/**
 * Tracks whether the configured provider is actually answering, not just
 * whether a key is set. A provider that is configured but failing every
 * call (bad key, no credits, outage) reports "degraded" until a call
 * succeeds again.
 */
@Injectable()
export class AiStatusService {
  private provider: 'anthropic' | 'openai' | null = null;
  private model: string | null = null;
  private lastSuccessAt: Date | null = null;
  private lastFailureAt: Date | null = null;

  configure(provider: 'anthropic' | 'openai' | null, model: string | null): void {
    this.provider = provider;
    this.model = model;
  }

  recordSuccess(at: Date = new Date()): void {
    this.lastSuccessAt = at;
  }

  recordFailure(at: Date = new Date()): void {
    this.lastFailureAt = at;
  }

  snapshot(): AiStatusSnapshot {
    let mode: AiMode;
    if (!this.provider) {
      mode = 'rules_only';
    } else if (this.lastFailureAt && (!this.lastSuccessAt || this.lastFailureAt > this.lastSuccessAt)) {
      mode = 'degraded';
    } else {
      mode = 'live';
    }

    return {
      mode,
      provider: this.provider,
      model: this.model,
      lastSuccessAt: this.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: this.lastFailureAt?.toISOString() ?? null,
    };
  }
}
