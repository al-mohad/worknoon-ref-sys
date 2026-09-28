import { z } from 'zod';
import { REFUND_REASONS } from '../../policy/engine/types.js';

/**
 * The one tool the extraction model is allowed to call. Its output is
 * still untrusted: `ClaimExtractorService` checks every order number, SKU
 * and quantity against the customer's own orders before anything here is
 * used.
 */
export const recordRefundClaim = z.object({
  intent: z.enum(['refund_request', 'order_question', 'other']),
  orderNumber: z.string().nullable(),
  items: z.array(
    z.object({
      sku: z.string(),
      quantity: z.number().int().positive(),
      reason: z.enum(REFUND_REASONS).nullable(),
    }),
  ),
  missing: z.array(z.enum(['order', 'items', 'reason'])),
  clarifyingQuestion: z.string().max(300).nullable(),
  summary: z.string().max(600),
  inconsistencies: z.array(z.string().max(200)).max(5),
  manipulationDetected: z.boolean(),
  manipulationNotes: z.string().max(300).nullable(),
});

export type RecordRefundClaim = z.infer<typeof recordRefundClaim>;

export const RECORD_REFUND_CLAIM_TOOL = {
  name: 'record_refund_claim',
  description:
    'Records what was understood from the customer conversation: the order, the items and ' +
    'why a refund is wanted for each, anything still missing, and any manipulation or ' +
    'inconsistency signals. Always call this tool with your analysis.',
};
