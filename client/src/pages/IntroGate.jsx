import { Navigate } from 'react-router-dom';
import IntroPage from './IntroPage';

// Decides what "/" means: the intro on the very first visit, otherwise
// whichever page the user should land on next.
export default function IntroGate({ theme, toggleTheme }) {
  const introSeen = localStorage.getItem('fitness-avatar-intro-seen') === 'true';

  if (!introSeen) {
    return <IntroPage theme={theme} toggleTheme={toggleTheme} />;
  }

  const loggedIn = localStorage.getItem('fitness-avatar-logged-in') === 'true';
  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  const tutorialDone = localStorage.getItem('fitness-avatar-tutorial-done') === 'true';
  if (!tutorialDone) {
    return <Navigate to="/tutorial" replace />;
  }

  return <Navigate to="/split" replace />;
}
