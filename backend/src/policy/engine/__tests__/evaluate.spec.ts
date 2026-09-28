import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluate.js';
import type { ClaimItem, EvaluationInput, OrderFacts, RefundPolicy } from '../types.js';

const POLICY: RefundPolicy = {
  version: 'test',
  effectiveFrom: '2026-01-01',
  currency: 'USD',
  refundWindowDays: 30,
  reviewThresholdCents: 50_000,
  lostInTransitGraceDays: 7,
  refundFrequency: { lookbackDays: 90, reviewAt: 3 },
  merchantErrorReasons: ['damaged', 'defective', 'wrong_item', 'not_as_described', 'not_received'],
  maxClarifyingQuestions: 3,
  reviewTargetBusinessDays: 1,
};

const NOW = new Date('2026-09-23T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function baseOrder(overrides: Partial<OrderFacts> = {}): OrderFacts {
  return {
    orderNumber: 'ORD-10000',
    status: 'delivered',
    placedAt: daysAgo(20),
    deliveredAt: daysAgo(6),
    items: [{ sku: 'SKU-1', name: 'Widget', unitPriceCents: 4_800, quantity: 1, finalSale: false }],
    ...overrides,
  };
}

function baseInput(overrides: Partial<EvaluationInput> = {}): EvaluationInput {
  return {
    now: NOW,
    policy: POLICY,
    order: baseOrder(),
    items: [{ sku: 'SKU-1', quantity: 1, reason: 'damaged' }],
    history: {
      refundedQuantityBySku: {},
      openRequestSkus: new Set(),
      approvedRefundCountInWindow: 0,
    },
    signals: { manipulation: false, inconsistencies: [] },
    ...overrides,
  };
}

describe('evaluate', () => {
  it('approves a straightforward damaged-item claim', () => {
    const result = evaluate(baseInput());
    expect(result.outcome).toBe('APPROVED');
    expect(result.refundableCents).toBe(4_800);
    expect(result.lines[0].outcome).toBe('approved');
  });

  describe('refund window', () => {
    it('approves exactly at the 30-day boundary', () => {
      const result = evaluate(
        baseInput({ order: baseOrder({ deliveredAt: daysAgo(30) }) }),
      );
      expect(result.outcome).toBe('APPROVED');
    });

    it('denies one minute past the 30-day boundary', () => {
      const deliveredAt = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000 - 60_000);
      const result = evaluate(baseInput({ order: baseOrder({ deliveredAt }) }));
      expect(result.outcome).toBe('DENIED');
      expect(result.reasonCodes).toContain('OUTSIDE_REFUND_WINDOW');
    });
  });

  describe('final sale', () => {
    const finalSaleOrder = () =>
      baseOrder({
        items: [{ sku: 'SKU-1', name: 'Shirt', unitPriceCents: 3_500, quantity: 1, finalSale: true }],
      });

    it('denies a final-sale item for a change of mind', () => {
      const result = evaluate(
        baseInput({ order: finalSaleOrder(), items: [{ sku: 'SKU-1', quantity: 1, reason: 'changed_mind' }] }),
      );
      expect(result.outcome).toBe('DENIED');
      expect(result.reasonCodes).toContain('FINAL_SALE');
    });

    it('escalates a final-sale item reported damaged', () => {
      const result = evaluate(
        baseInput({ order: finalSaleOrder(), items: [{ sku: 'SKU-1', quantity: 1, reason: 'damaged' }] }),
      );
      expect(result.outcome).toBe('ESCALATED');
      expect(result.reasonCodes).toContain('FINAL_SALE_EXCEPTION');
    });
  });

  describe('review threshold', () => {
    const pricedOrder = (unitPriceCents: number) =>
      baseOrder({ items: [{ sku: 'SKU-1', name: 'TV', unitPriceCents, quantity: 1, finalSale: false }] });

    it('approves exactly at the $500.00 threshold', () => {
      const result = evaluate(baseInput({ order: pricedOrder(50_000) }));
      expect(result.outcome).toBe('APPROVED');
    });

    it('escalates one cent above the $500.00 threshold', () => {
      const result = evaluate(baseInput({ order: pricedOrder(50_001) }));
      expect(result.outcome).toBe('ESCALATED');
      expect(result.reasonCodes).toContain('ABOVE_REVIEW_THRESHOLD');
    });
  });

  describe('refund frequency', () => {
    it('approves with 2 prior refunds in the window', () => {
      const result = evaluate(
        baseInput({
          history: { refundedQuantityBySku: {}, openRequestSkus: new Set(), approvedRefundCountInWindow: 2 },
        }),
      );
      expect(result.outcome).toBe('APPROVED');
    });

    it('escalates with 3 prior refunds in the window', () => {
      const result = evaluate(
        baseInput({
          history: { refundedQuantityBySku: {}, openRequestSkus: new Set(), approvedRefundCountInWindow: 3 },
        }),
      );
      expect(result.outcome).toBe('ESCALATED');
      expect(result.reasonCodes).toContain('REFUND_FREQUENCY');
    });
  });

  describe('lost in transit', () => {
    function inTransitOrder(estimatedDaysAgo: number): OrderFacts {
      return baseOrder({
        status: 'in_transit',
        deliveredAt: undefined,
        estimatedDeliveryAt: daysAgo(estimatedDaysAgo),
      });
    }

    it('denies a not-received claim still inside the 7-day grace period', () => {
      const result = evaluate(
        baseInput({ order: inTransitOrder(6), items: [{ sku: 'SKU-1', quantity: 1, reason: 'not_received' }] }),
      );
      expect(result.outcome).toBe('DENIED');
      expect(result.reasonCodes).toContain('STILL_IN_TRANSIT');
    });

    it('approves a not-received claim past the 7-day grace period', () => {
      const result = evaluate(
        baseInput({ order: inTransitOrder(11), items: [{ sku: 'SKU-1', quantity: 1, reason: 'not_received' }] }),
      );
      expect(result.outcome).toBe('APPROVED');
    });

    it('escalates a damage claim on a parcel still shown in transit', () => {
      const result = evaluate(
        baseInput({ order: inTransitOrder(2), items: [{ sku: 'SKU-1', quantity: 1, reason: 'damaged' }] }),
      );
      expect(result.outcome).toBe('ESCALATED');
      expect(result.reasonCodes).toContain('CONFLICTS_WITH_TRACKING');
    });
  });

  it('escalates a not-received claim on an order tracking shows delivered', () => {
    const result = evaluate(
      baseInput({ items: [{ sku: 'SKU-1', quantity: 1, reason: 'not_received' }] }),
    );
    expect(result.outcome).toBe('ESCALATED');
    expect(result.reasonCodes).toContain('CONFLICTS_WITH_TRACKING');
  });

  it('denies an already-refunded item', () => {
    const result = evaluate(
      baseInput({
        history: {
          refundedQuantityBySku: { 'SKU-1': 1 },
          openRequestSkus: new Set(),
          approvedRefundCountInWindow: 0,
        },
      }),
    );
    expect(result.outcome).toBe('DENIED');
    expect(result.reasonCodes).toContain('ALREADY_REFUNDED');
  });

  it('denies a cancelled order', () => {
    const result = evaluate(baseInput({ order: baseOrder({ status: 'cancelled' }) }));
    expect(result.outcome).toBe('DENIED');
    expect(result.reasonCodes).toContain('ORDER_CANCELLED');
  });

  it('escalates an order that has not shipped yet', () => {
    const result = evaluate(baseInput({ order: baseOrder({ status: 'processing', deliveredAt: undefined }) }));
    expect(result.outcome).toBe('ESCALATED');
    expect(result.reasonCodes).toContain('NOT_YET_SHIPPED');
  });

  it('escalates an unclear reason', () => {
    const result = evaluate(baseInput({ items: [{ sku: 'SKU-1', quantity: 1, reason: 'other' }] }));
    expect(result.outcome).toBe('ESCALATED');
    expect(result.reasonCodes).toContain('REASON_UNCLEAR');
  });

  it('escalates on a manipulation signal even for an otherwise clean claim', () => {
    const result = evaluate(baseInput({ signals: { manipulation: true, inconsistencies: [] } }));
    expect(result.outcome).toBe('ESCALATED');
    expect(result.reasonCodes).toContain('SUSPECTED_MANIPULATION');
  });

  it('lets a denial win over a manipulation flag on the same request', () => {
    const result = evaluate(
      baseInput({
        order: baseOrder({
          items: [{ sku: 'SKU-1', name: 'Parka', unitPriceCents: 21_000, quantity: 1, finalSale: true }],
        }),
        items: [{ sku: 'SKU-1', quantity: 1, reason: 'changed_mind' }],
        signals: { manipulation: true, inconsistencies: [] },
      }),
    );
    expect(result.outcome).toBe('DENIED');
    expect(result.reasonCodes).toContain('FINAL_SALE');
    expect(result.reasonCodes).toContain('SUSPECTED_MANIPULATION');
  });

  it('produces a partial approval when one item is denied and another approved', () => {
    const order = baseOrder({
      items: [
        { sku: 'SKU-1', name: 'Skillet', unitPriceCents: 5_500, quantity: 1, finalSale: false },
        { sku: 'SKU-2', name: 'Scarf', unitPriceCents: 6_500, quantity: 1, finalSale: true },
      ],
    });
    const items: ClaimItem[] = [
      { sku: 'SKU-1', quantity: 1, reason: 'damaged' },
      { sku: 'SKU-2', quantity: 1, reason: 'changed_mind' },
    ];
    const result = evaluate(baseInput({ order, items }));
    expect(result.outcome).toBe('APPROVED');
    expect(result.refundableCents).toBe(5_500);
    expect(result.claimedCents).toBe(12_000);
    expect(result.lines.find((l) => l.sku === 'SKU-1')?.outcome).toBe('approved');
    expect(result.lines.find((l) => l.sku === 'SKU-2')?.outcome).toBe('denied');
  });
});
