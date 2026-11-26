import { Navigate } from 'react-router-dom';
import IntroPage from './IntroPage';
import { useAuth } from '../hooks/useAuth';

// Decides what "/" means: the intro on the very first visit, otherwise
// whichever page the user should land on next.
export default function IntroGate({ theme, toggleTheme }) {
  const { user, loading } = useAuth();
  const introSeen = localStorage.getItem('fitness-avatar-intro-seen') === 'true';

  if (!introSeen) {
    return <IntroPage theme={theme} toggleTheme={toggleTheme} />;
  }

  // Wait for Firebase to check the saved login before deciding where to go.
  if (loading) {
    return <p className="auth-loading" role="status">Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const tutorialDone = localStorage.getItem('fitness-avatar-tutorial-done') === 'true';
  if (!tutorialDone) {
    return <Navigate to="/tutorial" replace />;
  }

  return <Navigate to="/split" replace />;
}
