import type { Check, RefundPolicy } from '../types.js';

/** Frequent refunders get a human look, regardless of how reasonable any single request is. */
export function evaluateRefundFrequency(approvedCountInWindow: number, policy: RefundPolicy): Check {
  if (approvedCountInWindow >= policy.refundFrequency.reviewAt) {
    return {
      rule: 'refund_frequency',
      scope: 'request',
      result: 'escalate',
      code: 'REFUND_FREQUENCY',
      detail: `${approvedCountInWindow} refunds were approved in the last ${policy.refundFrequency.lookbackDays} days.`,
    };
  }

  return {
    rule: 'refund_frequency',
    scope: 'request',
    result: 'pass',
    detail: `${approvedCountInWindow} refunds approved in the last ${policy.refundFrequency.lookbackDays} days, below the review threshold.`,
  };
}
