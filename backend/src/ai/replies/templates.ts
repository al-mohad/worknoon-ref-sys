import type { ReasonCode, RefundOutcome } from '../../policy/engine/types.js';
import type { DecisionFacts } from './reply.types.js';

/**
 * Customer-facing text for each reason code, written and reviewed once by
 * a person rather than generated per request. Reasons and next steps
 * shown to a customer always come from here, never from a customer's own
 * words - see docs/design.md section 6.
 */
const REASON_TEXT: Record<ReasonCode, string> = {
  ORDER_CANCELLED: 'that order was cancelled, so there is nothing to refund',
  NOT_YET_SHIPPED: "that order hasn't shipped yet - we'll have an agent cancel it instead",
  STILL_IN_TRANSIT: 'the package is still within its carrier delivery window',
  CONFLICTS_WITH_TRACKING: 'this needs a quick check against the carrier record',
  OUTSIDE_REFUND_WINDOW: 'it has been more than 30 days since delivery',
  ALREADY_REFUNDED: 'this item has already been refunded',
  REQUEST_ALREADY_OPEN: 'this item is already part of another open request',
  FINAL_SALE: 'this item was marked final sale at checkout',
  FINAL_SALE_EXCEPTION: 'this is a final sale item, so it needs a quick review',
  REASON_UNCLEAR: "we'd like an agent to confirm the details",
  ABOVE_REVIEW_THRESHOLD: 'refunds over $500 get a quick review',
  REFUND_FREQUENCY: 'recent refund activity on this account needs a quick review',
  SUSPECTED_MANIPULATION: 'this request needs a manual review',
  INCONSISTENT_CLAIM: 'a few details need to be confirmed with an agent',
  INSUFFICIENT_DETAILS: "we weren't able to get enough detail through chat",
};

const NEXT_STEPS: Record<RefundOutcome, string> = {
  APPROVED: 'The refund goes back to your original payment method within 5 to 10 business days.',
  DENIED: "If you think this isn't right, reply here and a support agent will take a look.",
  ESCALATED: "A support agent will review this and follow up within 1 business day. You'll see the outcome here.",
};

export function reasonCodesToText(codes: ReasonCode[]): string[] {
  return codes.map((code) => REASON_TEXT[code]);
}

export function nextStepsFor(outcome: RefundOutcome): string {
  return NEXT_STEPS[outcome];
}

/** Plain-text reply built with no model call at all - used when the AI layer is unavailable. */
export function renderTemplateReply(facts: DecisionFacts): string {
  const greeting = facts.firstName ? `Hi ${facts.firstName},` : 'Hi,';
  const reasonLine = facts.reasons.length > 0 ? ` (${facts.reasons.join('; ')})` : '';

  if (facts.outcome === 'APPROVED') {
    return `${greeting} good news - your refund of ${facts.refundAmount} has been approved${reasonLine}. Reference ${facts.reference}. ${facts.nextSteps}`;
  }

  if (facts.outcome === 'DENIED') {
    return `${greeting} thanks for reaching out. This request could not be approved${reasonLine}. Reference ${facts.reference}. ${facts.nextSteps}`;
  }

  return `${greeting} thanks for the details. This request has been sent to a support agent for review${reasonLine}. Reference ${facts.reference}. ${facts.nextSteps}`;
}

export function renderClarifyingTemplate(question: string): string {
  return question;
}
