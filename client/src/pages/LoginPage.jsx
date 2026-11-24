import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import ThemeToggle from '../components/ThemeToggle';
import './LoginPage.css';

export default function LoginPage({ theme, toggleTheme }) {
  const navigate = useNavigate();

  function handleAuthSuccess() {
    localStorage.setItem('fitness-avatar-logged-in', 'true');

    const tutorialDone = localStorage.getItem('fitness-avatar-tutorial-done') === 'true';
    navigate(tutorialDone ? '/split' : '/tutorial');
  }

  // Handle return callbacks from Google Login / OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const isGoogleCallback =
      params.get('google') === 'success' ||
      params.get('auth') === 'google' ||
      params.has('code') ||
      hash.includes('access_token') ||
      hash.includes('id_token');

    if (isGoogleCallback) {
      handleAuthSuccess();
    }
  }, []);

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
