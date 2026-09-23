import type { Check, EvaluationInput } from '../types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The clock for the window starts at delivery, or - for a parcel that was
 * never delivered - at the estimated delivery date, so a lost package
 * doesn't get an indefinite refund window.
 */
export function evaluateRefundWindow(input: EvaluationInput): Check {
  const { order, policy, now } = input;
  const anchor = order.deliveredAt ?? order.estimatedDeliveryAt;

  if (!anchor) {
    return {
      rule: 'refund_window',
      scope: 'request',
      result: 'not_applicable',
      detail: 'No delivery or estimated delivery date to measure the window from.',
    };
  }

  const elapsedMs = now.getTime() - anchor.getTime();
  const windowMs = policy.refundWindowDays * DAY_MS;
  const daysElapsed = Math.floor(elapsedMs / DAY_MS);

  if (elapsedMs > windowMs) {
    return {
      rule: 'refund_window',
      scope: 'request',
      result: 'deny',
      code: 'OUTSIDE_REFUND_WINDOW',
      detail: `${daysElapsed} days have passed, past the ${policy.refundWindowDays}-day refund window.`,
    };
  }

  return {
    rule: 'refund_window',
    scope: 'request',
    result: 'pass',
    detail: `${daysElapsed} of ${policy.refundWindowDays} days used.`,
  };
}
