import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './app/Landing.tsx';
import { AdminSignIn } from './features/admin/AdminSignIn.tsx';
import { Dashboard } from './features/admin/Dashboard.tsx';
import { RequestDetail } from './features/admin/RequestDetail.tsx';
import { PolicyPage } from './features/policy/PolicyPage.tsx';
import { ChatView } from './features/support/ChatView.tsx';
import { SupportHome } from './features/support/SupportHome.tsx';
import { SupportSignIn } from './features/support/SupportSignIn.tsx';
import { useAuth } from './lib/auth.tsx';

function RequireRole({ role, children }: { role: 'customer' | 'agent'; children: React.ReactNode }) {
  const { session } = useAuth();
  if (!session || session.role !== role) {
    return <Navigate to={role === 'customer' ? '/support' : '/admin'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/policy" element={<PolicyPage />} />

      <Route
        path="/support"
        element={session?.role === 'customer' ? <SupportHome /> : <SupportSignIn />}
      />
      <Route
        path="/support/requests/:reference"
        element={
          <RequireRole role="customer">
            <ChatView />
          </RequireRole>
        }
      />

      <Route path="/admin" element={session?.role === 'agent' ? <Dashboard /> : <AdminSignIn />} />
      <Route
        path="/admin/requests/:reference"
        element={
          <RequireRole role="agent">
            <RequestDetail />
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
