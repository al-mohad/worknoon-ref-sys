export type RequestStatus = 'collecting_info' | 'awaiting_review' | 'resolved';
export type RefundOutcome = 'APPROVED' | 'DENIED' | 'ESCALATED';
export type MessageRole = 'customer' | 'assistant' | 'agent_note';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface CustomerProfile {
  customerNumber: string;
  name: string;
  email: string;
  tier: 'standard' | 'plus';
}

export interface OrderItem {
  sku: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  finalSale: boolean;
}

export interface Order {
  orderNumber: string;
  status: 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  placedAt: string;
  deliveredAt: string | null;
  estimatedDeliveryAt: string | null;
  items: OrderItem[];
}

export interface DecisionView {
  outcome: RefundOutcome;
  finalOutcome: RefundOutcome | null;
  refund: { amountCents: number; amount: string; currency: string };
  items: { sku: string; name: string; quantity: number; result: 'approved' | 'denied' | 'escalated' }[];
}

export interface RefundRequestCustomerView {
  reference: string;
  status: RequestStatus;
  orderNumber: string | null;
  canRequestReview: boolean;
  messages: Message[];
  decision: DecisionView | null;
}

export type AiMode = 'live' | 'degraded' | 'rules_only';

export interface Health {
  status: 'ok' | 'degraded';
  database: string;
  ai: { mode: AiMode; provider: 'anthropic' | 'openai' | null; model: string | null };
}

export interface RefundRequestSummary {
  reference: string;
  status: RequestStatus;
  orderNumber: string | null;
  outcome: RefundOutcome | null;
  createdAt: string;
  updatedAt: string;
}

export interface Check {
  rule: string;
  scope: 'request' | 'item';
  sku?: string;
  result: 'pass' | 'deny' | 'escalate' | 'not_applicable';
  code?: string;
  detail: string;
}

export interface AiStep {
  step: string;
  provider: 'anthropic' | 'openai' | 'heuristic';
  model?: string;
  status: 'ok' | 'fallback' | 'error';
  usedFallback: boolean;
  latencyMs: number;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
  createdAt: string;
}

export interface TimelineEvent {
  type: string;
  detail: string;
  at: string;
}

export interface AdminListItem {
  reference: string;
  createdAt: string;
  customer: string;
  orderNumber: string | null;
  status: RequestStatus;
  outcome: RefundOutcome | null;
  finalOutcome: RefundOutcome | null;
  refundableCents: number;
  refundableAmount: string;
  flagged: boolean;
}

export interface AdminDetail {
  reference: string;
  status: RequestStatus;
  orderNumber: string | null;
  customer: { customerNumber: string; name: string; email: string } | null;
  flagged: boolean;
  messages: Message[];
  claim: { items: { sku: string; quantity: number; reason: string }[]; summary: string } | null;
  signals: { manipulation: { heuristic: boolean; model: boolean; notes?: string }; inconsistencies: string[] };
  evaluation: {
    policyVersion: string;
    evaluatedAt: string;
    checks: Check[];
    lines: { sku: string; name: string; quantity: number; reason: string; outcome: string; reasonCodes: string[] }[];
    refundableCents: number;
    refundableAmount: string;
    facts: unknown;
  } | null;
  decision: { outcome: RefundOutcome; reasonCodes: string[]; decidedAt: string } | null;
  reviewRequestedAt: string | null;
  approvalRefundCents: number;
  approvalRefundAmount: string;
  resolution: {
    outcome: 'APPROVED' | 'DENIED';
    refundCents: number;
    refundAmount: string;
    resolvedBy: { type: 'system' | 'agent'; agentId: string | null; name: string | null };
    note: string | null;
    resolvedAt: string;
  } | null;
  aiSteps: AiStep[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Metrics {
  windowDays: number;
  total: number;
  approved: number;
  denied: number;
  escalated: number;
  awaitingReview: number;
  flagged: number;
  autoResolutionRate: number;
}
