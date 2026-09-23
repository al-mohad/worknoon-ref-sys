import { Link } from 'react-router-dom';
import { Card, CardBody } from '../components/Card.tsx';

export function Landing() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 text-center">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Oakline Refund Desk</h1>
        <p className="mt-2 text-slate-600">
          AI-assisted refund requests, checked against a written policy every time.
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Link to="/support">
          <Card className="h-full text-left transition-shadow hover:shadow-md">
            <CardBody>
              <h2 className="text-lg font-medium text-slate-900">I'm a customer</h2>
              <p className="mt-1 text-sm text-slate-600">Start or check on a refund request.</p>
            </CardBody>
          </Card>
        </Link>
        <Link to="/admin">
          <Card className="h-full text-left transition-shadow hover:shadow-md">
            <CardBody>
              <h2 className="text-lg font-medium text-slate-900">I'm a support agent</h2>
              <p className="mt-1 text-sm text-slate-600">Review recent requests and decisions.</p>
            </CardBody>
          </Card>
        </Link>
      </div>
      <Link to="/policy" className="text-sm text-slate-500 underline underline-offset-2">
        Read the refund policy
      </Link>
    </div>
  );
}
