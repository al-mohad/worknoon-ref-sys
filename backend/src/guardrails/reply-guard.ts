import type { RefundOutcome } from '../policy/engine/types.js';

export interface ReplyFacts {
  outcome: RefundOutcome;
  reference: string;
  refundAmount: string;
  canary: string;
}

export interface ReplyGuardResult {
  ok: boolean;
  failedChecks: string[];
}

const APPROVAL_WORDS = /\b(approved|refund (has been )?issued|we('| ha)ve refunded)\b/i;
const DENIAL_WORDS = /\b(denied|not eligible|can'?t (be )?refund|cannot (be )?refund)\b/i;
const URL_PATTERN = /https?:\/\/|www\./i;
const MAX_REPLY_LENGTH = 1_200;

/**
 * The last line of defense before a model-written reply reaches a
 * customer: it has to agree with the decision the policy engine actually
 * made, carry the right amount and reference, stay short, and not leak
 * the canary token planted in the system prompt. Any failure swaps in a
 * template - see docs/design.md section 7.
 */
export function checkReply(reply: string, facts: ReplyFacts): ReplyGuardResult {
  const failedChecks: string[] = [];

  if (reply.length === 0 || reply.length > MAX_REPLY_LENGTH) {
    failedChecks.push('length');
  }

  if (facts.outcome === 'APPROVED' && DENIAL_WORDS.test(reply)) {
    failedChecks.push('outcome_wording');
  }
  if (facts.outcome !== 'APPROVED' && APPROVAL_WORDS.test(reply)) {
    failedChecks.push('outcome_wording');
  }

  if (facts.outcome === 'APPROVED' && !reply.includes(facts.refundAmount)) {
    failedChecks.push('amount_mismatch');
  }

  if (!reply.includes(facts.reference)) {
    failedChecks.push('missing_reference');
  }

  if (URL_PATTERN.test(reply)) {
    failedChecks.push('contains_url');
  }

  if (reply.includes(facts.canary)) {
    failedChecks.push('canary_leak');
  }

  return { ok: failedChecks.length === 0, failedChecks };
}
