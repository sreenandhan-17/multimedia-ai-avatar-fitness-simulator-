import { Navigate } from 'react-router-dom';

// Wrap any page that requires a fake login with this. No flag -> back to /login.
export default function ProtectedRoute({ children }) {
  const loggedIn = localStorage.getItem('fitness-avatar-logged-in') === 'true';

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
