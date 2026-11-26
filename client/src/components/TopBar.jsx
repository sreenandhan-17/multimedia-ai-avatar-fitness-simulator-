import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import './TopBar.css';

// Shown on every logged-in page: app name, link to tutorial, and the theme toggle.
export default function TopBar({ theme, toggleTheme }) {
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
      </nav>

      <div className="top-bar-actions">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    </header>
  );
}
