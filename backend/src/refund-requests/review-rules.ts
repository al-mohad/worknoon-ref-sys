import type { RefundRequest } from '../database/schemas/refund-request.schema.js';

type ReviewFields = Pick<RefundRequest, 'status' | 'decision' | 'resolution' | 'reviewRequestedAt' | 'evaluation'>;

/**
 * A customer can ask a person to look again at an automatic denial, once.
 * Agent decisions and escalations are already human-reviewed, so they
 * don't qualify.
 */
export function canRequestReview(request: ReviewFields): boolean {
  return (
    request.status === 'resolved' &&
    request.decision?.outcome === 'DENIED' &&
    request.resolution?.resolvedBy.type === 'system' &&
    !request.reviewRequestedAt
  );
}

/**
 * What an agent's approval pays out. For an escalation that's the amount
 * the engine left in play; for a disputed denial the engine refunded
 * nothing, so an approval pays for every item that was claimed.
 */
export function approvalRefundCents(request: ReviewFields): number {
  if (!request.evaluation) return 0;
  return request.decision?.outcome === 'DENIED'
    ? (request.evaluation.claimedCents ?? 0)
    : request.evaluation.refundableCents;
}
