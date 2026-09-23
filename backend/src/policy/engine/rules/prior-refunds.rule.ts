import type { Check, ClaimItem, RefundHistory } from '../types.js';

/** Per item: has this quantity already been refunded, or claimed by another open request? */
export function evaluatePriorRefunds(item: ClaimItem, history: RefundHistory): Check | null {
  const alreadyRefunded = history.refundedQuantityBySku[item.sku] ?? 0;
  if (alreadyRefunded >= item.quantity) {
    return {
      rule: 'prior_refunds',
      scope: 'item',
      sku: item.sku,
      result: 'deny',
      code: 'ALREADY_REFUNDED',
      detail: `${alreadyRefunded} unit(s) of ${item.sku} have already been refunded.`,
    };
  }

  if (history.openRequestSkus.has(item.sku)) {
    return {
      rule: 'prior_refunds',
      scope: 'item',
      sku: item.sku,
      result: 'deny',
      code: 'REQUEST_ALREADY_OPEN',
      detail: `${item.sku} is already part of another open refund request.`,
    };
  }

  return null;
}
