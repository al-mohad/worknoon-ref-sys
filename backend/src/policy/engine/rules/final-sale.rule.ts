import type { Check, ClaimItem, OrderItemFacts, RefundPolicy } from '../types.js';

/**
 * Final-sale items can't be returned for a change of mind, but a
 * merchant-caused problem (damaged, wrong item, ...) still gets reviewed
 * rather than auto-denied - the policy calls this the final-sale
 * exception, and it always goes to a person.
 */
export function evaluateFinalSale(
  item: ClaimItem,
  orderItem: OrderItemFacts,
  policy: RefundPolicy,
): Check | null {
  if (!orderItem.finalSale) {
    return null;
  }

  const isMerchantError = policy.merchantErrorReasons.includes(item.reason);
  if (isMerchantError) {
    return {
      rule: 'final_sale',
      scope: 'item',
      sku: item.sku,
      result: 'escalate',
      code: 'FINAL_SALE_EXCEPTION',
      detail: `${item.sku} is final sale, but the reported reason (${item.reason}) needs a human review.`,
    };
  }

  return {
    rule: 'final_sale',
    scope: 'item',
    sku: item.sku,
    result: 'deny',
    code: 'FINAL_SALE',
    detail: `${item.sku} is final sale and not eligible for a ${item.reason} refund.`,
  };
}
