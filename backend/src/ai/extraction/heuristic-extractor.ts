import { Injectable } from '@nestjs/common';
import type { RefundReason } from '../../policy/engine/types.js';
import type { ConversationTurn, ExtractionResult, OrderContext } from './extraction.types.js';

const REASON_KEYWORDS: Array<{ reason: RefundReason; patterns: RegExp[] }> = [
  { reason: 'not_received', patterns: [/never arrived/i, /never received/i, /didn'?t (arrive|receive)/i, /hasn'?t arrived/i, /haven'?t (arrived|received)/i] },
  { reason: 'damaged', patterns: [/damag/i, /broken/i, /crack/i, /shattered/i, /torn/i] },
  { reason: 'defective', patterns: [/defect/i, /doesn'?t work/i, /won'?t (turn on|charge|start)/i, /stopped (working|charging)/i, /malfunction/i, /rattl/i] },
  { reason: 'wrong_item', patterns: [/wrong (item|size|color)/i, /sent (me |us )?a? ?(size|color)?\s*\d*\s*(instead)/i, /not what i ordered/i] },
  { reason: 'not_as_described', patterns: [/not as described/i, /doesn'?t match the (listing|description|photos?)/i] },
  { reason: 'changed_mind', patterns: [/change(d)? my mind/i, /don'?t want (it|this|the)/i, /doesn'?t fit/i, /no longer (need|want)/i] },
];

const ORDER_NUMBER_PATTERN = /\bORD-\d{4,}\b/i;

const ORDER_QUESTION_PATTERNS = [
  /\b(list|show|see) (all )?(my|the) orders?\b/i,
  /\bwhat orders?\b/i,
  /\bwhich orders?\b/i,
  /\bhow many orders?\b/i,
  /\b(status|track(ing)?) (of |for )?(my|the )?order\b/i,
  /\b(status|track(ing)?) of\b.*\bORD-\d{4,}\b/i,
  /\bwhere('| i)?s my order\b/i,
];

/** Whole-word overlap rather than a full-name substring match, so "the skillet" matches "Cast iron skillet". */
function itemMatchesText(itemName: string, lowerCaseText: string): boolean {
  const words = itemName.toLowerCase().split(/\s+/).filter((word) => word.length >= 4);
  return words.some((word) => new RegExp(`\\b${word}\\b`).test(lowerCaseText));
}

/**
 * Used only when the LLM is unavailable or its output fails validation.
 * Keyword matching over the visible order data is deliberately simple and
 * English-only - see docs/design.md section 6 for why that trade-off is
 * acceptable here.
 */
@Injectable()
export class HeuristicExtractor {
  extract(orders: OrderContext[], conversation: ConversationTurn[]): ExtractionResult {
    const text = conversation
      .filter((turn) => turn.role === 'customer')
      .map((turn) => turn.content)
      .join(' ');

    const reason = REASON_KEYWORDS.find(({ patterns }) => patterns.some((p) => p.test(text)))?.reason ?? null;

    // A question about the account's orders, with no refund reason
    // alongside it (so "my order never arrived" still goes through the
    // refund path below, not this one).
    if (!reason && ORDER_QUESTION_PATTERNS.some((p) => p.test(text))) {
      const namedMatch = text.match(ORDER_NUMBER_PATTERN);
      const namedOrder = namedMatch
        ? orders.find((o) => o.orderNumber.toUpperCase() === namedMatch[0].toUpperCase())
        : undefined;
      return {
        intent: 'order_question',
        orderNumber: namedOrder?.orderNumber ?? null,
        items: [],
        missing: [],
        clarifyingQuestion: null,
        summary: 'Customer asked about their order(s), not a refund.',
        inconsistencies: [],
        manipulationDetected: false,
        manipulationNotes: null,
        usedFallback: true,
      };
    }

    const orderMatch = text.match(ORDER_NUMBER_PATTERN);
    let order = orderMatch
      ? orders.find((o) => o.orderNumber.toUpperCase() === orderMatch[0].toUpperCase())
      : undefined;
    if (!order && orders.length === 1) {
      order = orders[0];
    }

    const missing: Array<'order' | 'items' | 'reason'> = [];
    if (!order) missing.push('order');

    let items: ExtractionResult['items'] = [];
    if (order) {
      const lowerText = text.toLowerCase();
      const matchedByName = order.items.filter((item) => itemMatchesText(item.name, lowerText));
      const candidates = matchedByName.length > 0 ? matchedByName : order.items.length === 1 ? order.items : [];
      if (candidates.length === 0) {
        missing.push('items');
      } else if (!reason) {
        missing.push('reason');
      } else {
        items = candidates.map((item) => ({ sku: item.sku, quantity: item.quantity, reason }));
      }
    } else {
      missing.push('items', 'reason');
    }

    const clarifyingQuestion = missing.includes('order')
      ? "Which order is this about? You can share the order number (it looks like ORD-12345)."
      : missing.includes('items')
        ? 'Which item from that order is this about?'
        : missing.includes('reason')
          ? "What's the issue with this item - damaged, wrong item, doesn't work, or something else?"
          : null;

    return {
      intent: 'refund_request',
      orderNumber: order?.orderNumber ?? null,
      items,
      missing,
      clarifyingQuestion,
      summary: order
        ? `Customer reported a possible ${reason ?? 'unspecified'} issue with order ${order.orderNumber}.`
        : 'Customer has not yet identified which order this is about.',
      inconsistencies: [],
      manipulationDetected: false,
      manipulationNotes: null,
      usedFallback: true,
    };
  }
}
