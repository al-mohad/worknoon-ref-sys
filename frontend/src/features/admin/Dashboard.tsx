import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AiStatusBadge } from '../../components/AiStatusBadge.tsx';
import { Badge, outcomeTone, statusTone } from '../../components/Badge.tsx';
import { Button } from '../../components/Button.tsx';
import { Card, CardBody } from '../../components/Card.tsx';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth.tsx';
import { formatDateTime, outcomeLabel } from '../../lib/format.ts';
import type { AdminListItem, Metrics, RequestStatus } from '../../lib/types.ts';

const STATUS_FILTERS: { value: RequestStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'collecting_info', label: 'Collecting info' },
  { value: 'awaiting_review', label: 'Awaiting review' },
  { value: 'resolved', label: 'Resolved' },
];

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      </CardBody>
    </Card>
  );
}

export function Dashboard() {
  const { session, signOut } = useAuth();
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [flagged, setFlagged] = useState(false);
  const [q, setQ] = useState('');

  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => api.get<Metrics>('/admin/metrics'),
    refetchInterval: 5_000,
  });

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (flagged) params.set('flagged', 'true');
  if (q) params.set('q', q);

  const { data: list, isPending } = useQuery({
    queryKey: ['admin-refund-requests', status, flagged, q],
    queryFn: () => api.get<{ items: AdminListItem[] }>(`/admin/refund-requests?${params.toString()}`),
    placeholderData: keepPreviousData,
    refetchInterval: 5_000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Support dashboard</h1>
          <p className="text-sm text-slate-500">Signed in as {session?.name}</p>
        </div>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <div className="mt-3">
        <AiStatusBadge />
      </div>

      {metrics && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Metric label="Requests (7d)" value={metrics.total} />
          <Metric label="Approved" value={metrics.approved} />
          <Metric label="Denied" value={metrics.denied} />
          <Metric label="Escalated" value={metrics.escalated} />
          <Metric label="Awaiting review" value={metrics.awaitingReview} />
          <Metric label="Flagged" value={metrics.flagged} />
          <Metric label="Auto-resolved" value={`${metrics.autoResolutionRate}%`} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RequestStatus | '')}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-700">
          <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} />
          Flagged only
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reference, order, email"
          className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Reference</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Outcome</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list?.items.map((item) => (
              <tr key={item.reference} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link
                    to={`/admin/requests/${item.reference}`}
                    className="font-medium text-slate-900 underline underline-offset-2"
                  >
                    {item.reference}
                  </Link>
                  {item.flagged && (
                    <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                      Flagged
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{item.customer}</td>
                <td className="px-4 py-2">{item.orderNumber ?? '-'}</td>
                <td className="px-4 py-2">{item.refundableAmount}</td>
                <td className="px-4 py-2">
                  {item.finalOutcome && <Badge tone={outcomeTone(item.finalOutcome)}>{outcomeLabel(item.finalOutcome)}</Badge>}
                </td>
                <td className="px-4 py-2">
                  <Badge tone={statusTone(item.status)}>{item.status.replaceAll('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-2 text-slate-500">{formatDateTime(item.createdAt)}</td>
              </tr>
            ))}
            {isPending && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Loading requests...
                </td>
              </tr>
            )}
            {list?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Nothing matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
