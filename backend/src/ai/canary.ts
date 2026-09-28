import { randomUUID } from 'node:crypto';

/**
 * A per-process random token woven into every system prompt. If it ever
 * appears in model output shown to a customer, that's a sign of prompt
 * extraction and the reply guard rejects it.
 */
export const CANARY_TOKEN = Symbol('CANARY_TOKEN');
export const canaryTokenProvider = { provide: CANARY_TOKEN, useValue: `canary-${randomUUID()}` };
