import { describe, expect, it } from 'vitest';
import { approvalRefundCents, canRequestReview } from '../review-rules.js';

type Request = Parameters<typeof canRequestReview>[0];

function systemDenial(overrides: Partial<Request> = {}): Request {
  return {
    status: 'resolved',
    decision: { outcome: 'DENIED', reasonCodes: ['FINAL_SALE'], decidedAt: new Date() },
    resolution: {
      outcome: 'DENIED',
      refundCents: 0,
      resolvedBy: { type: 'system' },
      resolvedAt: new Date(),
    },
    evaluation: {
      policyVersion: 'test',
      evaluatedAt: new Date(),
      facts: {},
      checks: [],
      lines: [],
      refundableCents: 0,
      claimedCents: 3_500,
    },
    ...overrides,
  } as Request;
}

describe('canRequestReview', () => {
  it('allows a review of an automatic denial', () => {
    expect(canRequestReview(systemDenial())).toBe(true);
  });

  it('allows it only once', () => {
    expect(canRequestReview(systemDenial({ reviewRequestedAt: new Date() }))).toBe(false);
  });

  it('does not allow it for a denial an agent already made', () => {
    const agentDenial = systemDenial();
    agentDenial.resolution!.resolvedBy = { type: 'agent', name: 'Jordan Reyes' };
    expect(canRequestReview(agentDenial)).toBe(false);
  });

  it('does not allow it for an approval', () => {
    const approval = systemDenial({
      decision: { outcome: 'APPROVED', reasonCodes: [], decidedAt: new Date() },
    });
    expect(canRequestReview(approval)).toBe(false);
  });
});

describe('approvalRefundCents', () => {
  it('pays every claimed item when an agent approves a disputed denial', () => {
    expect(approvalRefundCents(systemDenial())).toBe(3_500);
  });

  it('pays the amount the engine left in play for an escalation', () => {
    const escalation = systemDenial({
      decision: { outcome: 'ESCALATED', reasonCodes: ['ABOVE_REVIEW_THRESHOLD'], decidedAt: new Date() },
    });
    escalation.evaluation!.refundableCents = 74_900;
    escalation.evaluation!.claimedCents = 74_900;
    expect(approvalRefundCents(escalation)).toBe(74_900);
  });

  it('pays nothing when no claim was ever evaluated', () => {
    expect(approvalRefundCents(systemDenial({ evaluation: undefined }))).toBe(0);
  });
});
