import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AiStatusBadge } from '../../components/AiStatusBadge.tsx';
import { Badge, statusTone } from '../../components/Badge.tsx';
import { Button } from '../../components/Button.tsx';
import { TypingIndicator } from '../../components/TypingIndicator.tsx';
import { api } from '../../lib/api.ts';
import { formatDateTime } from '../../lib/format.ts';
import type { MessageRole, RefundRequestCustomerView } from '../../lib/types.ts';
import { DecisionCard } from './DecisionCard.tsx';
import { OrdersPanel } from './OrdersPanel.tsx';

const BUBBLE: Record<MessageRole, string> = {
  customer: 'bg-slate-900 text-white',
  assistant: 'bg-slate-100 text-slate-800',
  agent_note: 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
};

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

  const onUpdated = (updated: RefundRequestCustomerView) => {
    queryClient.setQueryData(['refund-request', reference], updated);
    queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
  };

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post<RefundRequestCustomerView>(`/refund-requests/${reference}/messages`, {
        content,
        clientMessageId: crypto.randomUUID(),
      }),
    onSuccess: onUpdated,
  });

  const requestReview = useMutation({
    mutationFn: () => api.post<RefundRequestCustomerView>(`/refund-requests/${reference}/review-request`),
    onSuccess: onUpdated,
  });

  if (!req) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-500">Loading...</div>;
  }

  const canSend = req.status === 'collecting_info' && !sendMessage.isPending;

  function submit() {
    const content = draft.trim();
    if (!content || !canSend) return;
    sendMessage.mutate(content);
    setDraft('');
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:grid-cols-[1fr_280px]">
      <div>
        <div className="flex items-center justify-between">
          <Link to="/support" className="text-sm text-slate-500 underline underline-offset-2">
            &larr; Your requests
          </Link>
          <Badge tone={statusTone(req.status)}>{req.status.replaceAll('_', ' ')}</Badge>
        </div>
        <div className="mt-3">
          <AiStatusBadge />
        </div>

        <div
          aria-live="polite"
          className="mt-3 flex max-h-[60vh] flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          {req.messages.length === 0 && !sendMessage.isPending && (
            <p className="text-sm text-slate-500">Tell us which order this is about and what went wrong.</p>
          )}
          {req.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${BUBBLE[m.role]}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`mt-1 text-[10px] ${m.role === 'customer' ? 'text-slate-300' : 'text-slate-400'}`}>
                  {formatDateTime(m.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {sendMessage.isPending && (
            <>
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-slate-900/80 px-4 py-2 text-sm text-white">
                  <p className="whitespace-pre-wrap">{sendMessage.variables}</p>
                </div>
              </div>
              <TypingIndicator />
            </>
          )}
        </div>

        {sendMessage.isError && (
          <p className="mt-2 text-sm text-rose-600">That message didn't go through. Try sending it again.</p>
        )}

        {req.decision && (
          <div className="mt-4">
            <DecisionCard
              decision={req.decision}
              reference={req.reference}
              canRequestReview={req.canRequestReview}
              requestingReview={requestReview.isPending}
              onRequestReview={() => requestReview.mutate()}
            />
          </div>
        )}

        {req.status === 'awaiting_review' && (
          <p className="mt-3 text-sm text-slate-500">
            This is with a support agent for review. This page checks for updates automatically.
          </p>
        )}

        {req.status === 'collecting_info' ? (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="mt-4 flex items-end gap-2"
            >
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={2}
                maxLength={2_000}
                disabled={sendMessage.isPending}
                placeholder="Type a message. Enter to send, Shift+Enter for a new line."
                className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
              />
              <Button type="submit" disabled={!canSend || !draft.trim()}>
                Send
              </Button>
            </form>
            <p className="mt-1 text-right text-xs text-slate-400">{draft.length}/2000</p>
          </>
        ) : (
          req.status === 'resolved' && (
            <div className="mt-4">
              <Link to="/support">
                <Button variant="secondary">Start another request</Button>
              </Link>
            </div>
          )
        )}
      </div>

      <OrdersPanel onAsk={setDraft} />
    </div>
  );
}
