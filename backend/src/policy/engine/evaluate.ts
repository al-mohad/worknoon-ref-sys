import { evaluateFinalSale } from './rules/final-sale.rule.js';
import { evaluateConsistency, evaluateManipulation } from './rules/manipulation.rule.js';
import { evaluateOrderState } from './rules/order-state.rule.js';
import { evaluatePriorRefunds } from './rules/prior-refunds.rule.js';
import { evaluateReason } from './rules/reason.rule.js';
import { evaluateRefundFrequency } from './rules/refund-frequency.rule.js';
import { evaluateRefundWindow } from './rules/refund-window.rule.js';
import { evaluateReviewThreshold } from './rules/review-threshold.rule.js';
import type { Check, Evaluation, EvaluationInput, LineOutcome, LineResult } from './types.js';

/**
 * Runs every rule against the claim and combines the results with a fixed
 * precedence: a request-level denial beats everything, then "every item
 * denied" also denies the whole request, then any remaining escalation
 * wins, and only a claim with nothing left to flag is approved. Denials
 * outrank escalations because they rest on facts a reviewer can't change
 * (dates, final-sale flags, order state); a customer who disagrees can
 * still ask for a review afterwards.
 */
export function evaluate(input: EvaluationInput): Evaluation {
  const checks: Check[] = [];
  const claimedNotReceived = input.items.some((item) => item.reason === 'not_received');

  const orderChecks = evaluateOrderState(input, claimedNotReceived);
  checks.push(...orderChecks);
  const requestDeniedByOrderState = orderChecks.some((c) => c.result === 'deny');
  let requestEscalated = orderChecks.some((c) => c.result === 'escalate');

  const windowCheck = evaluateRefundWindow(input);
  checks.push(windowCheck);

  const manipulationCheck = evaluateManipulation(input.signals);
  const consistencyCheck = evaluateConsistency(input.signals);
  checks.push(manipulationCheck, consistencyCheck);
  requestEscalated =
    requestEscalated ||
    manipulationCheck.result === 'escalate' ||
    consistencyCheck.result === 'escalate';

  const requestLevelDeny = requestDeniedByOrderState || windowCheck.result === 'deny';

  const lines: LineResult[] = input.items.map((item) => {
    const orderItem = input.order.items.find((oi) => oi.sku === item.sku);
    if (!orderItem) {
      throw new Error(
        `Claim item ${item.sku} is not part of order ${input.order.orderNumber}; ` +
          'this should have been rejected before reaching the policy engine.',
      );
    }

    const itemChecks = [
      evaluatePriorRefunds(item, input.history),
      evaluateFinalSale(item, orderItem, input.policy),
      evaluateReason(item),
    ].filter((c): c is Check => c !== null);
    checks.push(...itemChecks);

    let outcome: LineOutcome;
    if (requestLevelDeny || itemChecks.some((c) => c.result === 'deny')) {
      outcome = 'denied';
    } else if (requestEscalated || itemChecks.some((c) => c.result === 'escalate')) {
      outcome = 'escalated';
    } else {
      outcome = 'approved';
    }

    return {
      sku: item.sku,
      name: orderItem.name,
      quantity: item.quantity,
      reason: item.reason,
      outcome,
      reasonCodes: itemChecks.flatMap((c) => (c.code ? [c.code] : [])),
    };
  });

  const lineValue = (line: LineResult) =>
    input.order.items.find((oi) => oi.sku === line.sku)!.unitPriceCents * line.quantity;

  const claimedCents = lines.reduce((sum, line) => sum + lineValue(line), 0);
  const refundableCents = requestLevelDeny
    ? 0
    : lines.reduce((sum, line) => (line.outcome === 'denied' ? sum : sum + lineValue(line)), 0);

  const thresholdCheck = evaluateReviewThreshold(refundableCents, input.policy);
  const frequencyCheck = evaluateRefundFrequency(
    input.history.approvedRefundCountInWindow,
    input.policy,
  );
  checks.push(thresholdCheck, frequencyCheck);

  if (!requestLevelDeny && (thresholdCheck.result === 'escalate' || frequencyCheck.result === 'escalate')) {
    for (const line of lines) {
      if (line.outcome === 'approved') line.outcome = 'escalated';
    }
  }

  const outcome =
    requestLevelDeny || lines.every((line) => line.outcome === 'denied')
      ? 'DENIED'
      : lines.some((line) => line.outcome === 'escalated')
        ? 'ESCALATED'
        : 'APPROVED';

  const reasonCodes = [...new Set(checks.flatMap((c) => (c.code ? [c.code] : [])))];

  return { outcome, checks, lines, refundableCents, claimedCents, reasonCodes };
}
