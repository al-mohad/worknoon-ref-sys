import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button.tsx';
import { Card, CardBody } from '../../components/Card.tsx';
import { ApiError } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth.tsx';
import { DEMO_CUSTOMERS } from './demo-customers.ts';

export function SupportSignIn() {
  const { signInCustomer } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSignIn(target: string) {
    setPending(true);
    setError(null);
    try {
      await signInCustomer(target);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-sm text-slate-500 underline underline-offset-2">
        &larr; Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">
        This is a demo - sign-in only checks the email against the seeded customer list.
      </p>

      <Card className="mt-6">
        <CardBody className="flex flex-wrap items-center gap-3">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <Button disabled={pending || !email} onClick={() => handleSignIn(email)}>
            Sign in
          </Button>
        </CardBody>
      </Card>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <h2 className="mt-8 text-sm font-medium text-slate-500">Or pick a seeded customer</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DEMO_CUSTOMERS.map((customer) => (
          <button
            key={customer.email}
            disabled={pending}
            onClick={() => handleSignIn(customer.email)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <div className="font-medium text-slate-900">{customer.name}</div>
            <div className="mt-0.5 text-slate-500">{customer.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
