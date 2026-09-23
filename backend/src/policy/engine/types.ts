/** The reasons a customer can give for wanting a refund. */
export const REFUND_REASONS = [
  'damaged',
  'defective',
  'wrong_item',
  'not_as_described',
  'not_received',
  'changed_mind',
  'other',
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

/** One rule's verdict, always recorded even when it passes. */
export const RULE_IDS = [
  'order_state',
  'refund_window',
  'prior_refunds',
  'final_sale',
  'reason',
  'review_threshold',
  'refund_frequency',
  'manipulation',
  'consistency',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export const REASON_CODES = [
  'ORDER_CANCELLED',
  'NOT_YET_SHIPPED',
  'STILL_IN_TRANSIT',
  'CONFLICTS_WITH_TRACKING',
  'OUTSIDE_REFUND_WINDOW',
  'ALREADY_REFUNDED',
  'REQUEST_ALREADY_OPEN',
  'FINAL_SALE',
  'FINAL_SALE_EXCEPTION',
  'REASON_UNCLEAR',
  'ABOVE_REVIEW_THRESHOLD',
  'REFUND_FREQUENCY',
  'SUSPECTED_MANIPULATION',
  'INCONSISTENT_CLAIM',
  'INSUFFICIENT_DETAILS',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export type CheckResult = 'pass' | 'deny' | 'escalate' | 'not_applicable';

export interface Check {
  rule: RuleId;
  scope: 'request' | 'item';
  sku?: string;
  result: CheckResult;
  code?: ReasonCode;
  detail: string;
}

export interface ClaimItem {
  sku: string;
  quantity: number;
  reason: RefundReason;
}

export type LineOutcome = 'approved' | 'denied' | 'escalated';

export interface LineResult {
  sku: string;
  quantity: number;
  reason: RefundReason;
  outcome: LineOutcome;
  reasonCodes: ReasonCode[];
}

export type RefundOutcome = 'APPROVED' | 'DENIED' | 'ESCALATED';

export interface RefundPolicy {
  version: string;
  effectiveFrom: string;
  currency: 'USD';
  refundWindowDays: number;
  reviewThresholdCents: number;
  lostInTransitGraceDays: number;
  refundFrequency: { lookbackDays: number; reviewAt: number };
  merchantErrorReasons: RefundReason[];
  maxClarifyingQuestions: number;
  reviewTargetBusinessDays: number;
}

export type OrderStatus = 'processing' | 'in_transit' | 'delivered' | 'cancelled';

export interface OrderItemFacts {
  sku: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  finalSale: boolean;
}

export interface OrderFacts {
  orderNumber: string;
  status: OrderStatus;
  placedAt: Date;
  deliveredAt?: Date;
  estimatedDeliveryAt?: Date;
  trackingStatus?: 'in_transit' | 'delivered';
  items: OrderItemFacts[];
}

export interface RefundHistory {
  /** SKU -> quantity already refunded or already claimed by an open request, for this order. */
  refundedQuantityBySku: Record<string, number>;
  openRequestSkus: Set<string>;
  /** Approved refunds for this customer within the policy's lookback window. */
  approvedRefundCountInWindow: number;
}

export interface EvaluationSignals {
  manipulation: boolean;
  inconsistencies: string[];
}

export interface EvaluationInput {
  now: Date;
  policy: RefundPolicy;
  order: OrderFacts;
  items: ClaimItem[];
  history: RefundHistory;
  signals: EvaluationSignals;
}

export interface Evaluation {
  outcome: RefundOutcome;
  checks: Check[];
  lines: LineResult[];
  refundableCents: number;
  reasonCodes: ReasonCode[];
}
