import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, outcomeTone, statusTone } from '../../components/Badge.tsx';
import { Card, CardBody, CardHeader } from '../../components/Card.tsx';
import { api } from '../../lib/api.ts';
import { formatDateTime, outcomeLabel } from '../../lib/format.ts';
import type { AdminDetail } from '../../lib/types.ts';
import { ReviewPanel } from './ReviewPanel.tsx';

function checkTone(result: string) {
  if (result === 'deny') return 'red' as const;
  if (result === 'escalate') return 'amber' as const;
  if (result === 'pass') return 'green' as const;
  return 'slate' as const;
}

export function RequestDetail() {
  const { reference } = useParams<{ reference: string }>();
  const { data: req } = useQuery({
    queryKey: ['admin-request', reference],
    queryFn: () => api.get<AdminDetail>(`/admin/refund-requests/${reference}`),
    enabled: !!reference,
  });

  if (!req) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-slate-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/admin" className="text-sm text-slate-500 underline underline-offset-2">
        &larr; Dashboard
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{req.reference}</h1>
          <p className="text-sm text-slate-500">
            {req.customer?.name} &middot; {req.customer?.email} &middot; {req.orderNumber ?? 'No order identified'}
          </p>
        </div>
        <div className="flex gap-2">
          {req.flagged && <Badge tone="red">Flagged</Badge>}
          <Badge tone={statusTone(req.status)}>{req.status.replaceAll('_', ' ')}</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {req.decision && (
            <Card>
              <CardHeader>Decision</CardHeader>
              <CardBody className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge tone={outcomeTone(req.decision.outcome)}>{outcomeLabel(req.decision.outcome)}</Badge>
                  <span className="text-sm text-slate-500">policy {req.evaluation?.policyVersion}</span>
                </div>
                {req.evaluation && (
                  <p className="text-lg font-semibold text-slate-900">{req.evaluation.refundableAmount}</p>
                )}
                {req.resolution && (
                  <p className="text-sm text-slate-600">
                    Resolved as <strong>{outcomeLabel(req.resolution.outcome)}</strong> by{' '}
                    {req.resolution.resolvedBy.type === 'agent' ? req.resolution.resolvedBy.name : 'the system'} on{' '}
                    {formatDateTime(req.resolution.resolvedAt)}.
                    {req.resolution.note && <span className="block italic text-slate-500">"{req.resolution.note}"</span>}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>Conversation</CardHeader>
            <CardBody className="space-y-3">
              {req.messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-medium capitalize text-slate-700">{m.role.replaceAll('_', ' ')}:</span>{' '}
                  <span className="text-slate-600">{m.content}</span>
                  <span className="ml-2 text-xs text-slate-400">{formatDateTime(m.createdAt)}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>AI analysis</CardHeader>
            <CardBody className="space-y-3 text-sm">
              {req.claim && (
                <p className="text-slate-600">
                  <span className="font-medium text-slate-700">Model summary (unverified): </span>
                  {req.claim.summary}
                </p>
              )}
              {(req.signals.manipulation.heuristic || req.signals.manipulation.model) && (
                <p className="text-rose-700">
                  Manipulation signal raised{req.signals.manipulation.notes ? `: ${req.signals.manipulation.notes}` : '.'}
                </p>
              )}
              {req.signals.inconsistencies.length > 0 && (
                <ul className="list-disc pl-5 text-amber-700">
                  {req.signals.inconsistencies.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              )}
              <div className="space-y-1">
                {req.aiSteps.map((step, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {step.step} &middot; {step.provider}
                      {step.model ? ` (${step.model})` : ''} &middot; {step.status}
                    </span>
                    <span>{step.latencyMs}ms</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {req.evaluation && (
            <Card>
              <CardHeader>Policy checks</CardHeader>
              <CardBody className="space-y-2">
                {req.evaluation.checks.map((check, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <span className="font-medium text-slate-700">{check.rule.replaceAll('_', ' ')}</span>
                      {check.sku && <span className="text-slate-400"> ({check.sku})</span>}
                      <p className="text-slate-500">{check.detail}</p>
                    </div>
                    <Badge tone={checkTone(check.result)}>{check.result}</Badge>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>Timeline</CardHeader>
            <CardBody className="space-y-1.5 text-sm text-slate-600">
              {req.timeline.map((event, i) => (
                <div key={i} className="flex justify-between">
                  <span>{event.detail}</span>
                  <span className="text-xs text-slate-400">{formatDateTime(event.at)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div>
          {req.status === 'awaiting_review' && (
            <ReviewPanel
              reference={req.reference}
              approvalAmount={req.approvalRefundAmount}
              approvalRefundCents={req.approvalRefundCents}
              reviewRequested={!!req.reviewRequestedAt}
            />
          )}
        </div>
      </div>
    </div>
  );
}
