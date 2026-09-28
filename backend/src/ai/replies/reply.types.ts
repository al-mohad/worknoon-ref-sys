import type { RefundOutcome } from '../../policy/engine/types.js';

export interface DecisionFactItem {
  name: string;
  result: 'approved' | 'denied' | 'escalated';
}

/**
 * Everything a reply is allowed to draw on, computed entirely by code
 * before an LLM ever sees it. No customer-written text reaches this
 * object except `firstName`, which is length-capped and sanitized the
 * same way as a message.
 */
export interface DecisionFacts {
  firstName: string;
  outcome: RefundOutcome;
  reference: string;
  items: DecisionFactItem[];
  refundAmount: string;
  reasons: string[];
  nextSteps: string;
}
