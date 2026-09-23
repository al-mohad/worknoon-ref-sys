import type { Check, ClaimItem } from '../types.js';

/** A reason of "other" means the extractor couldn't classify the complaint. */
export function evaluateReason(item: ClaimItem): Check | null {
  if (item.reason !== 'other') {
    return null;
  }

  return {
    rule: 'reason',
    scope: 'item',
    sku: item.sku,
    result: 'escalate',
    code: 'REASON_UNCLEAR',
    detail: `The reason for ${item.sku} could not be classified from the conversation.`,
  };
}
