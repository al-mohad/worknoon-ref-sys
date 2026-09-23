import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button.tsx';
import { Card, CardBody } from '../../components/Card.tsx';
import { ApiError } from '../../lib/api.ts';
import { useAuth } from '../../lib/auth.tsx';

export function AdminSignIn() {
  const { signInAgent } = useAuth();
  const [email, setEmail] = useState('agent@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signInAgent(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Link to="/" className="text-sm text-slate-500 underline underline-offset-2">
        &larr; Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Support sign-in</h1>
      <p className="mt-1 text-sm text-slate-600">
        Demo credentials: <code>agent@example.com</code> / <code>refund-desk-demo</code> (or your{' '}
        <code>AGENT_EMAIL</code>/<code>AGENT_PASSWORD</code>).
      </p>
      <Card className="mt-6">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <Button type="submit" disabled={pending} className="w-full">
              Sign in
            </Button>
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
