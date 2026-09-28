import { describe, expect, it } from 'vitest';
import { AiStatusService } from '../ai-status.service.js';
import { LlmOutputError, LlmUnavailableError, type LlmClient } from '../llm-client.port.js';
import { MonitoredLlmClient } from '../monitored-llm-client.js';

function clientThat(behavior: () => Promise<never> | Promise<unknown>): LlmClient {
  return {
    provider: 'openai',
    model: 'test-model',
    callTool: behavior as LlmClient['callTool'],
    complete: behavior as LlmClient['complete'],
  };
}

const REQUEST = { system: 's', input: 'i', maxOutputTokens: 10 };

describe('AiStatusService', () => {
  it('reports rules_only when no provider is configured', () => {
    const status = new AiStatusService();
    status.configure(null, null);
    expect(status.snapshot().mode).toBe('rules_only');
  });

  it('reports live for a configured provider before any call', () => {
    const status = new AiStatusService();
    status.configure('openai', 'test-model');
    expect(status.snapshot().mode).toBe('live');
  });

  it('reports degraded while the latest call failed, and recovers on the next success', () => {
    const status = new AiStatusService();
    status.configure('openai', 'test-model');
    status.recordSuccess(new Date('2026-09-28T10:00:00Z'));
    status.recordFailure(new Date('2026-09-28T10:01:00Z'));
    expect(status.snapshot().mode).toBe('degraded');

    status.recordSuccess(new Date('2026-09-28T10:02:00Z'));
    expect(status.snapshot().mode).toBe('live');
  });
});

describe('MonitoredLlmClient', () => {
  it('records an unavailable provider as a failure', async () => {
    const status = new AiStatusService();
    status.configure('openai', 'test-model');
    const client = new MonitoredLlmClient(
      clientThat(() => Promise.reject(new LlmUnavailableError('429 no credits'))),
      status,
    );

    await expect(client.complete(REQUEST)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(status.snapshot().mode).toBe('degraded');
  });

  it('does not treat a malformed tool call as the provider being offline', async () => {
    const status = new AiStatusService();
    status.configure('openai', 'test-model');
    const client = new MonitoredLlmClient(
      clientThat(() => Promise.reject(new LlmOutputError('no tool call'))),
      status,
    );

    await expect(client.complete(REQUEST)).rejects.toBeInstanceOf(LlmOutputError);
    expect(status.snapshot().mode).toBe('live');
  });

  it('records a successful call', async () => {
    const status = new AiStatusService();
    status.configure('openai', 'test-model');
    status.recordFailure();
    const client = new MonitoredLlmClient(
      clientThat(() =>
        Promise.resolve({ value: 'ok', latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0 } }),
      ),
      status,
    );

    await client.complete(REQUEST);
    expect(status.snapshot().mode).toBe('live');
  });
});
