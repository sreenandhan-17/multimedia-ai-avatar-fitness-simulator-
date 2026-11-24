import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import ThemeToggle from '../components/ThemeToggle';
import './IntroPage.css';

const NORMAL_DURATION_MS = 6000;
const REDUCED_DURATION_MS = 3000;

export default function IntroPage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  // Read once per mount so the duration can't change mid-countdown.
  const [duration] = useState(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return prefersReducedMotion ? REDUCED_DURATION_MS : NORMAL_DURATION_MS;
  });
  const prefersReducedMotion = duration === REDUCED_DURATION_MS;

  const finishIntro = useCallback(() => {
    localStorage.setItem('fitness-avatar-intro-seen', 'true');
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    const startTime = Date.now();

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(nextProgress);

      if (elapsed >= duration) {
        clearInterval(intervalId);
        finishIntro();
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [duration, finishIntro]);

  return (
    <div className="intro-page">
      <div className="floating-theme-toggle">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="intro-content">
        <Avatar exercise="squat" size="large" />
        <h1 className={`intro-title ${prefersReducedMotion ? '' : 'fade-in'}`}>
          Fitness Avatar Simulator
        </h1>
        <p className={`intro-tagline ${prefersReducedMotion ? '' : 'fade-in'}`}>
          Your avatar leads, your webcam checks your form.
        </p>
      </div>

      <div className="intro-footer">
        <div className="intro-progress-track">
          <div className="intro-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <button type="button" className="btn-secondary btn-md" onClick={finishIntro}>
          Skip intro
        </button>
      </div>
    </div>
  );
}
