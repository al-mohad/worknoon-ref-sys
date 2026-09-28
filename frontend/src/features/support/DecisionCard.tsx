import { Badge, outcomeTone } from '../../components/Badge.tsx';
import { Button } from '../../components/Button.tsx';
import { outcomeLabel } from '../../lib/format.ts';
import type { DecisionView } from '../../lib/types.ts';

interface DecisionCardProps {
  decision: DecisionView;
  reference: string;
  canRequestReview?: boolean;
  requestingReview?: boolean;
  onRequestReview?: () => void;
}

const LINE_TONE = { approved: 'APPROVED', denied: 'DENIED', escalated: 'ESCALATED' } as const;

export function DecisionCard({
  decision,
  reference,
  canRequestReview = false,
  requestingReview = false,
  onRequestReview,
}: DecisionCardProps) {
  const shown = decision.finalOutcome ?? decision.outcome;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Badge tone={outcomeTone(shown)}>{outcomeLabel(shown)}</Badge>
        <span className="text-xs text-slate-400">{reference}</span>
      </div>
      {decision.refund.amountCents > 0 && (
        <p className="mt-2 text-lg font-semibold text-slate-900">{decision.refund.amount}</p>
      )}
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {decision.items.map((item) => (
          <li key={item.sku} className="flex items-center justify-between">
            <span>
              {item.name} &times;{item.quantity}
            </span>
            <Badge tone={outcomeTone(LINE_TONE[item.result])}>{item.result}</Badge>
          </li>
        ))}
      </ul>
      {canRequestReview && onRequestReview && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-500">Think this isn't right?</p>
          <Button variant="secondary" disabled={requestingReview} onClick={onRequestReview}>
            {requestingReview ? 'Sending...' : 'Ask an agent to review'}
          </Button>
        </div>
      )}
    </div>
  );
}
