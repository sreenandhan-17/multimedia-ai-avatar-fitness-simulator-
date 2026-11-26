import { Navigate, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

export default function LoginPage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  function getNextPage() {
    const tutorialDone = localStorage.getItem('fitness-avatar-tutorial-done') === 'true';
    return tutorialDone ? '/split' : '/tutorial';
  }

  function handleAuthSuccess() {
    navigate(getNextPage());
  }

  // Already logged in (for example after a refresh): skip the login screen.
  if (!loading && user) {
    return <Navigate to={getNextPage()} replace />;
  }

  return (
    <div className="login-page">
      <div className="floating-theme-toggle">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="login-content">
        <h1 className="login-title">Fitness Avatar Simulator</h1>
        <p className="login-tagline">Your avatar leads, your webcam checks your form.</p>
        <AuthCard onAuthSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
}
