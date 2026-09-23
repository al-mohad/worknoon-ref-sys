import type { Check, RefundPolicy } from '../types.js';

/** Checked against what would actually be paid out, after item-level denials. */
export function evaluateReviewThreshold(refundableCents: number, policy: RefundPolicy): Check {
  if (refundableCents > policy.reviewThresholdCents) {
    return {
      rule: 'review_threshold',
      scope: 'request',
      result: 'escalate',
      code: 'ABOVE_REVIEW_THRESHOLD',
      detail: `The refundable amount exceeds the ${(policy.reviewThresholdCents / 100).toFixed(2)} review threshold.`,
    };
  }

  return {
    rule: 'review_threshold',
    scope: 'request',
    result: 'pass',
    detail: 'The refundable amount is within the automatic-approval threshold.',
  };
}
