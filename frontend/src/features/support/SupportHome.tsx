import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiStatusBadge } from '../../components/AiStatusBadge.tsx';
import { Badge, outcomeTone, statusTone } from '../../components/Badge.tsx';
import { Button } from '../../components/Button.tsx';
import { Card, CardBody, CardHeader } from '../../components/Card.tsx';
import { TypingIndicator } from '../../components/TypingIndicator.tsx';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth.tsx';
import { formatDateTime, outcomeLabel } from '../../lib/format.ts';
import type { RefundRequestCustomerView, RefundRequestSummary } from '../../lib/types.ts';

export function SupportHome() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: requests, isPending } = useQuery({
    queryKey: ['refund-requests'],
    queryFn: () => api.get<RefundRequestSummary[]>('/refund-requests'),
  });

  const createRequest = useMutation({
    mutationFn: (initialMessage: string) =>
      api.post<RefundRequestCustomerView>('/refund-requests', { message: initialMessage }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
      navigate(`/support/requests/${created.reference}`);
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Hi {session?.name}</h1>
          <p className="text-sm text-slate-500">{session?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/policy" className="self-center text-sm text-slate-500 underline underline-offset-2">
            Refund policy
          </Link>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <AiStatusBadge />
      </div>

      <Card className="mt-4">
        <CardHeader>Start a new refund request</CardHeader>
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) createRequest.mutate(message.trim());
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened - which order, and what's wrong with it."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <Button type="submit" disabled={createRequest.isPending || !message.trim()}>
              {createRequest.isPending ? 'Sending...' : 'Send'}
            </Button>
          </form>
          {createRequest.isPending && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-slate-900/80 px-4 py-2 text-sm text-white">
                  <p className="whitespace-pre-wrap">{createRequest.variables}</p>
                </div>
              </div>
              <TypingIndicator />
            </div>
          )}
          {createRequest.isError && (
            <p className="mt-2 text-sm text-rose-600">Something went wrong sending that. Try again.</p>
          )}
        </CardBody>
      </Card>

      <h2 className="mt-8 text-sm font-medium text-slate-500">Your requests</h2>
      <div className="mt-3 space-y-2">
        {isPending && <p className="text-sm text-slate-500">Loading...</p>}
        {requests?.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
        {requests?.map((r) => (
          <Link
            key={r.reference}
            to={`/support/requests/${r.reference}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition-colors hover:bg-slate-50"
          >
            <div>
              <div className="font-medium text-slate-900">{r.reference}</div>
              <div className="text-slate-500">
                {r.orderNumber ?? 'Order not yet identified'} &middot; {formatDateTime(r.createdAt)}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge tone={statusTone(r.status)}>{r.status.replaceAll('_', ' ')}</Badge>
              {r.outcome && <Badge tone={outcomeTone(r.outcome)}>{outcomeLabel(r.outcome)}</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
