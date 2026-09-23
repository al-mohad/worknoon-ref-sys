import type { ReactNode } from 'react';

const TONES = {
  green: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  red: 'bg-rose-100 text-rose-800 ring-rose-600/20',
  amber: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  blue: 'bg-blue-100 text-blue-800 ring-blue-600/20',
} as const;

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function outcomeTone(outcome: string | null | undefined): keyof typeof TONES {
  switch (outcome) {
    case 'APPROVED':
      return 'green';
    case 'DENIED':
      return 'red';
    case 'ESCALATED':
      return 'amber';
    default:
      return 'slate';
  }
}

export function statusTone(status: string): keyof typeof TONES {
  switch (status) {
    case 'resolved':
      return 'green';
    case 'awaiting_review':
      return 'amber';
    default:
      return 'blue';
  }
}
