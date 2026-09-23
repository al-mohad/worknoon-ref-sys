import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../components/Button.tsx';
import { Card, CardBody, CardHeader } from '../../components/Card.tsx';
import { api } from '../../lib/api.ts';
import type { AdminDetail } from '../../lib/types.ts';

export function ReviewPanel({ reference }: { reference: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const resolve = useMutation({
    mutationFn: (outcome: 'APPROVED' | 'DENIED') =>
      api.post<AdminDetail>(`/admin/refund-requests/${reference}/resolution`, { outcome, note }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-request', reference], updated);
      queryClient.invalidateQueries({ queryKey: ['admin-refund-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      setNote('');
    },
  });

  const noteValid = note.trim().length >= 10;

  return (
    <Card>
      <CardHeader>Review</CardHeader>
      <CardBody className="space-y-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Note for the record (required, at least 10 characters)"
          className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <Button disabled={!noteValid || resolve.isPending} onClick={() => resolve.mutate('APPROVED')}>
            Approve
          </Button>
          <Button
            variant="danger"
            disabled={!noteValid || resolve.isPending}
            onClick={() => resolve.mutate('DENIED')}
          >
            Deny
          </Button>
        </div>
        {resolve.isError && <p className="text-sm text-rose-600">Couldn't save that - try again.</p>}
      </CardBody>
    </Card>
  );
}
