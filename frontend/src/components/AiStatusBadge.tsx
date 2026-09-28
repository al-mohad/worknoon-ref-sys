import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.ts';
import type { AiMode, Health } from '../lib/types.ts';

const MESSAGES: Record<Exclude<AiMode, 'live'>, string> = {
  degraded: 'AI assistant unavailable right now - replies are templated, decisions are unaffected',
  rules_only: 'AI assistant not configured - running in rules-only mode',
};

/** Shown only when the AI layer isn't answering; renders nothing while it's live. */
export function AiStatusBadge() {
  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<Health>('/health'),
    refetchInterval: 15_000,
  });

  const mode = data?.ai.mode;
  if (!mode || mode === 'live') return null;

  return (
    <p
      role="status"
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {MESSAGES[mode]}
    </p>
  );
}
