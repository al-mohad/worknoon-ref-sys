import { formatCents } from '../../common/money.js';
import type { RefundRequestDocument } from '../../database/schemas/refund-request.schema.js';
import { canRequestReview } from '../review-rules.js';

/**
 * What a customer sees: never the policy checks, AI metadata, or signals
 * that fed the decision - only the conversation and the outcome.
 */
export function toCustomerView(request: RefundRequestDocument) {
  const finalOutcome = request.resolution?.outcome ?? request.decision?.outcome;

  return {
    reference: request.reference,
    status: request.status,
    orderNumber: request.orderNumber ?? null,
    canRequestReview: canRequestReview(request),
    messages: request.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
    decision: request.decision
      ? {
          outcome: request.decision.outcome,
          finalOutcome: finalOutcome ?? null,
          refund: {
            amountCents: request.resolution?.refundCents ?? 0,
            amount: formatCents(request.resolution?.refundCents ?? 0),
            currency: 'USD',
          },
          items: (request.evaluation?.lines ?? []).map((line) => ({
            sku: line.sku,
            name: line.name,
            quantity: line.quantity,
            result: line.outcome,
          })),
        }
      : null,
  };
}

export function toCustomerSummary(request: RefundRequestDocument) {
  return {
    reference: request.reference,
    status: request.status,
    orderNumber: request.orderNumber ?? null,
    outcome: request.resolution?.outcome ?? request.decision?.outcome ?? null,
    createdAt: request.get('createdAt'),
    updatedAt: request.get('updatedAt'),
  };
}
