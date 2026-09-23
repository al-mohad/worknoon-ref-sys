import { describe, expect, it } from 'vitest';
import type { OrderContext } from '../../extraction/extraction.types.js';
import { renderOrderQuestionAnswer } from '../templates.js';

const ORDERS: OrderContext[] = [
  {
    orderNumber: 'ORD-10231',
    status: 'delivered',
    deliveredAt: '2026-09-17T00:00:00.000Z',
    items: [{ sku: 'KIT-2041', name: 'Ceramic pour-over set', quantity: 1 }],
  },
  {
    orderNumber: 'ORD-10365',
    status: 'processing',
    deliveredAt: null,
    items: [{ sku: 'DSK-8856', name: 'Standing desk', quantity: 1 }],
  },
];

describe('renderOrderQuestionAnswer', () => {
  it('lists every order when none is named', () => {
    const answer = renderOrderQuestionAnswer(ORDERS, null);
    expect(answer).toContain('ORD-10231');
    expect(answer).toContain('ORD-10365');
    expect(answer).toContain('2 orders');
  });

  it('describes only the named order when one is resolved', () => {
    const answer = renderOrderQuestionAnswer(ORDERS, 'ORD-10365');
    expect(answer).toContain('ORD-10365');
    expect(answer).not.toContain('ORD-10231');
    expect(answer).toContain('being prepared');
  });

  it('handles an account with no orders', () => {
    expect(renderOrderQuestionAnswer([], null)).toContain("don't see any orders");
  });
});
