import { Badge, outcomeTone } from '../../components/Badge.tsx';
import { outcomeLabel } from '../../lib/format.ts';
import type { DecisionView } from '../../lib/types.ts';

export function DecisionCard({ decision, reference }: { decision: DecisionView; reference: string }) {
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
            <Badge tone={outcomeTone(item.result === 'escalated' ? 'ESCALATED' : item.result === 'approved' ? 'APPROVED' : 'DENIED')}>
              {item.result}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
