import { Link, useNavigate } from 'react-router-dom';
import { signOutUser } from '../services/auth';
import ThemeToggle from './ThemeToggle';
import './TopBar.css';

// Shown on every logged-in page: app name, link to tutorial, and the theme toggle.
export default function TopBar({ theme, toggleTheme }) {
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch (error) {
      // Signing out can fail (no .env, no network). Go to the login page anyway;
      // if the user is still signed in, that page sends them straight back.
      console.error('Sign out failed:', error);
    }
    navigate('/login');
  }

  return (
    <header className="top-bar">
      <span className="top-bar-title">Fitness Avatar Simulator</span>

      <nav className="top-bar-nav">
        <Link to="/tutorial" className="top-bar-link">
          Tutorial
        </Link>
        <Link to="/dashboard" className="top-bar-link">
          Dashboard
        </Link>
        <button type="button" className="top-bar-link" onClick={handleSignOut}>
          Sign out
        </button>
      </nav>

      <div className="top-bar-actions">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    </header>
  );
}
