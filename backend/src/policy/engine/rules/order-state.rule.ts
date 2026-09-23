import type { Check, EvaluationInput } from '../types.js';

/**
 * Rules that depend on the order's shipping state rather than on what was
 * claimed: a cancelled order, one that hasn't shipped, one still inside
 * its carrier's delivery window, or a claim that contradicts tracking.
 */
export function evaluateOrderState(input: EvaluationInput, claimedNotReceived: boolean): Check[] {
  const { order, policy, now } = input;
  const checks: Check[] = [];

  if (order.status === 'cancelled') {
    checks.push({
      rule: 'order_state',
      scope: 'request',
      result: 'deny',
      code: 'ORDER_CANCELLED',
      detail: 'The order was cancelled, so there is nothing to refund.',
    });
    return checks;
  }

  if (order.status === 'processing') {
    checks.push({
      rule: 'order_state',
      scope: 'request',
      result: 'escalate',
      code: 'NOT_YET_SHIPPED',
      detail: 'The order has not shipped yet; an agent should cancel it instead of refunding it.',
    });
    return checks;
  }

  if (order.status === 'in_transit') {
    const estimated = order.estimatedDeliveryAt;
    const graceEnds = estimated
      ? new Date(estimated.getTime() + policy.lostInTransitGraceDays * 24 * 60 * 60 * 1000)
      : undefined;

    if (claimedNotReceived && graceEnds && now < graceEnds) {
      checks.push({
        rule: 'order_state',
        scope: 'request',
        result: 'deny',
        code: 'STILL_IN_TRANSIT',
        detail: `The package is still within its ${policy.lostInTransitGraceDays}-day carrier grace period.`,
      });
      return checks;
    }

    if (!claimedNotReceived) {
      // Claiming damage/defect on a parcel tracking shows as in transit
      // doesn't match the carrier record.
      checks.push({
        rule: 'order_state',
        scope: 'request',
        result: 'escalate',
        code: 'CONFLICTS_WITH_TRACKING',
        detail: 'The claim does not match the carrier status; an agent should verify it.',
      });
      return checks;
    }
  }

  if (order.status === 'delivered' && claimedNotReceived) {
    checks.push({
      rule: 'order_state',
      scope: 'request',
      result: 'escalate',
      code: 'CONFLICTS_WITH_TRACKING',
      detail: 'Tracking shows the order was delivered; an agent should verify with the carrier.',
    });
    return checks;
  }

  checks.push({
    rule: 'order_state',
    scope: 'request',
    result: 'pass',
    detail: `Order status "${order.status}" matches the claim.`,
  });
  return checks;
}
