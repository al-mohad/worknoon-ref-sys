import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, statusTone } from '../../components/Badge.tsx';
import { Button } from '../../components/Button.tsx';
import { api } from '../../lib/api.ts';
import { formatDateTime } from '../../lib/format.ts';
import type { RefundRequestCustomerView } from '../../lib/types.ts';
import { DecisionCard } from './DecisionCard.tsx';
import { OrdersPanel } from './OrdersPanel.tsx';

export function ChatView() {
  const { reference } = useParams<{ reference: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data: req } = useQuery({
    queryKey: ['refund-request', reference],
    queryFn: () => api.get<RefundRequestCustomerView>(`/refund-requests/${reference}`),
    enabled: !!reference,
    refetchInterval: (query) => (query.state.data?.status === 'awaiting_review' ? 10_000 : false),
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post<RefundRequestCustomerView>(`/refund-requests/${reference}/messages`, {
        content,
        clientMessageId: crypto.randomUUID(),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['refund-request', reference], updated);
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
    },
  });

  if (!req) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-500">Loading...</div>;
  }

  const canSend = req.status === 'collecting_info';

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center justify-between">
          <Link to="/support" className="text-sm text-slate-500 underline underline-offset-2">
            &larr; Your requests
          </Link>
          <Badge tone={statusTone(req.status)}>{req.status.replaceAll('_', ' ')}</Badge>
        </div>

        <div
          aria-live="polite"
          className="mt-4 flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          {req.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === 'customer'
                    ? 'bg-slate-900 text-white'
                    : m.role === 'agent_note'
                      ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                      : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`mt-1 text-[10px] ${m.role === 'customer' ? 'text-slate-300' : 'text-slate-400'}`}>
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {req.decision && (
          <div className="mt-4">
            <DecisionCard decision={req.decision} reference={req.reference} />
          </div>
        )}

        {req.status === 'awaiting_review' && (
          <p className="mt-3 text-sm text-slate-500">
            This is with a support agent for review. This page checks for updates automatically.
          </p>
        )}

        {canSend ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) {
                sendMessage.mutate(draft.trim());
                setDraft('');
              }
            }}
            className="mt-4 flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim()) {
                    sendMessage.mutate(draft.trim());
                    setDraft('');
                  }
                }
              }}
              rows={2}
              maxLength={2_000}
              disabled={sendMessage.isPending}
              placeholder="Type a message. Enter to send, Shift+Enter for a new line."
              className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
            />
            <Button type="submit" disabled={sendMessage.isPending || !draft.trim()}>
              Send
            </Button>
          </form>
        ) : (
          req.status === 'resolved' && (
            <div className="mt-4">
              <Link to="/support">
                <Button variant="secondary">Start another request</Button>
              </Link>
            </div>
          )
        )}
        <p className="mt-1 text-right text-xs text-slate-400">{draft.length}/2000</p>
      </div>

      <OrdersPanel onAsk={setDraft} />
    </div>
  );
}
