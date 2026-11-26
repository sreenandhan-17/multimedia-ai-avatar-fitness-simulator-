import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Wrap any page that needs a logged-in user with this.
// While Firebase is still checking the saved login we show nothing,
// otherwise a refresh would bounce a logged-in user to /login.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="auth-loading" role="status">Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
