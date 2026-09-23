import { formatCents } from '../../common/money.js';
import type { CustomerDocument } from '../../database/schemas/customer.schema.js';
import type { RefundRequestDocument } from '../../database/schemas/refund-request.schema.js';

/** The full picture an agent needs: signals, checks, AI steps and timeline included. */
export function toAdminDetail(request: RefundRequestDocument, customer: CustomerDocument | null) {
  return {
    reference: request.reference,
    status: request.status,
    orderNumber: request.orderNumber ?? null,
    customer: customer
      ? { customerNumber: customer.customerNumber, name: customer.name, email: customer.email }
      : null,
    flagged: request.signals.manipulation.heuristic || request.signals.manipulation.model,
    messages: request.messages,
    claim: request.claim ?? null,
    signals: request.signals,
    evaluation: request.evaluation
      ? {
          policyVersion: request.evaluation.policyVersion,
          evaluatedAt: request.evaluation.evaluatedAt,
          checks: request.evaluation.checks,
          lines: request.evaluation.lines,
          refundableCents: request.evaluation.refundableCents,
          refundableAmount: formatCents(request.evaluation.refundableCents),
          facts: request.evaluation.facts,
        }
      : null,
    decision: request.decision ?? null,
    resolution: request.resolution
      ? {
          outcome: request.resolution.outcome,
          refundCents: request.resolution.refundCents,
          refundAmount: formatCents(request.resolution.refundCents),
          resolvedBy: {
            type: request.resolution.resolvedBy.type,
            agentId: request.resolution.resolvedBy.agentId ?? null,
            name: request.resolution.resolvedBy.name ?? null,
          },
          note: request.resolution.note ?? null,
          resolvedAt: request.resolution.resolvedAt,
        }
      : null,
    aiSteps: request.aiSteps,
    timeline: request.timeline,
    createdAt: request.get('createdAt'),
    updatedAt: request.get('updatedAt'),
  };
}

export function toAdminListItem(request: RefundRequestDocument, customerLabel: string) {
  return {
    reference: request.reference,
    createdAt: request.get('createdAt'),
    customer: customerLabel,
    orderNumber: request.orderNumber ?? null,
    status: request.status,
    outcome: request.decision?.outcome ?? null,
    finalOutcome: request.resolution?.outcome ?? request.decision?.outcome ?? null,
    refundableCents: request.evaluation?.refundableCents ?? 0,
    refundableAmount: formatCents(request.evaluation?.refundableCents ?? 0),
    flagged: request.signals.manipulation.heuristic || request.signals.manipulation.model,
  };
}
