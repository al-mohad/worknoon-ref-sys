import { describe, expect, it } from 'vitest';
import { HeuristicExtractor } from '../heuristic-extractor.js';
import type { OrderContext } from '../extraction.types.js';

const ORDER: OrderContext = {
  orderNumber: 'ORD-10198',
  status: 'delivered',
  deliveredAt: '2026-08-05',
  items: [{ sku: 'AUD-9021', name: 'Noise-cancelling headphones', quantity: 1 }],
};

describe('HeuristicExtractor', () => {
  const extractor = new HeuristicExtractor();

  it('recognizes "stopped charging" as defective', () => {
    const result = extractor.extract([ORDER], [{ role: 'customer', content: 'They stopped charging' }]);
    expect(result.missing).not.toContain('reason');
    expect(result.items[0]?.reason).toBe('defective');
  });

  it('recognizes "haven\'t received" as not_received', () => {
    const result = extractor.extract(
      [ORDER],
      [{ role: 'customer', content: "I still haven't received my headphones" }],
    );
    expect(result.missing).not.toContain('reason');
    expect(result.items[0]?.reason).toBe('not_received');
  });

  it('asks for the order when the customer has more than one and none is named', () => {
    const other: OrderContext = { ...ORDER, orderNumber: 'ORD-10199' };
    const result = extractor.extract([ORDER, other], [{ role: 'customer', content: 'It broke' }]);
    expect(result.missing).toContain('order');
  });
});
