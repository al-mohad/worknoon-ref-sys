import type { ClaimItem } from '../../policy/engine/types.js';

export interface OrderContext {
  orderNumber: string;
  status: string;
  deliveredAt: string | null;
  items: { sku: string; name: string; quantity: number }[];
}

export interface ConversationTurn {
  role: 'customer' | 'assistant';
  content: string;
}

export type ExtractionIntent = 'refund_request' | 'order_question' | 'other';

export interface ExtractionResult {
  intent: ExtractionIntent;
  orderNumber: string | null;
  /** Only items whose SKU was verified against the resolved order and that have a reason. */
  items: ClaimItem[];
  missing: Array<'order' | 'items' | 'reason'>;
  clarifyingQuestion: string | null;
  summary: string;
  inconsistencies: string[];
  manipulationDetected: boolean;
  manipulationNotes: string | null;
  /** True when this came from the keyword fallback rather than a model call. */
  usedFallback: boolean;
}
