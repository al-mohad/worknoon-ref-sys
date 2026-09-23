import { useQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';

interface PolicyResponse {
  version: string;
  markdown: string;
}

// Strips the --- front matter block the loader validates against so only
// the customer-facing document body renders.
function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

export function PolicyPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['policy'],
    queryFn: () => api.get<PolicyResponse>('/policy'),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-slate-500 underline underline-offset-2">
        &larr; Back
      </Link>
      <div className="prose prose-slate mt-6 max-w-none">
        {isPending && <p>Loading policy...</p>}
        {isError && <p className="text-rose-600">Couldn't load the policy right now.</p>}
        {data && <Markdown>{stripFrontMatter(data.markdown)}</Markdown>}
      </div>
    </div>
  );
}
