import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar3D from '../components/Avatar3D';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { getPostLoginRoute } from '../utils/postLoginRoute';
import './HomePage.css';

const HOW_IT_WORKS = [
  {
    title: 'Pick an exercise',
    description: 'Choose a day and a move from your weekly split.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="8" y="10" width="32" height="28" rx="4" strokeLinejoin="round" />
        <path d="M15 19h18M15 26h18M15 33h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Follow the avatar',
    description: 'Watch the 3D avatar demonstrate the correct posture.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="24" cy="12" r="5" />
        <path d="M24 17v12l-8 11M24 29l8 11M16 22l8 3 8-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Camera checks your posture',
    description: 'Your webcam tracks your joints live, right in the browser.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="6" y="14" width="26" height="20" rx="4" strokeLinejoin="round" />
        <path d="M32 21l10-6v18l-10-6" strokeLinejoin="round" />
        <circle cx="19" cy="24" r="5" />
      </svg>
    ),
  },
  {
    title: 'Get live corrections',
    description: 'See instant feedback and track your progress over time.',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M8 36V24M19 36V15M30 36V21M41 36V10" strokeLinecap="round" />
        <path d="M8 13l9-5 11 4 13-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

// Exercises shown in turn on the hero avatar, one per body part group, so a
// first-time visitor sees a variety rather than just squat on a loop.
const HERO_EXERCISES = ['squat', 'bicep-curl', 'push-up', 'shoulder-press', 'plank', 'lunge'];
const HERO_EXERCISE_INTERVAL_MS = 4000;

const QUICK_INSTRUCTIONS = [
  'Stand about 2-3 meters from the camera',
  'Keep your whole body in frame',
  'Use a well-lit room so the camera can see you clearly',
  'Allow camera access when your browser asks',
  "Follow the avatar's pace, don't rush the reps",
];

// Fades a section in once it scrolls into view. Skips the animation entirely
// under prefers-reduced-motion, showing the content right away instead.
function FadeInSection({ children, className = '' }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return undefined;
    }

    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`home-fade-section ${isVisible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
}

export default function HomePage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [heroExerciseIndex, setHeroExerciseIndex] = useState(0);

  // Cycle the hero avatar through a few exercises so it's not just squat on
  // a loop. Skipped under reduced motion, same as the rest of this page.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const intervalId = setInterval(() => {
      setHeroExerciseIndex((prev) => (prev + 1) % HERO_EXERCISES.length);
    }, HERO_EXERCISE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  function handleGetStarted() {
    if (!loading && user) {
      navigate(getPostLoginRoute());
    } else {
      navigate('/login');
    }
  }

  return (
    <div className="home-page">
      <div className="floating-theme-toggle">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="home-glow home-glow-one" aria-hidden="true" />
      <div className="home-glow home-glow-two" aria-hidden="true" />

      <section className="home-hero">
        <div className="home-hero-text">
          <h1 className="home-hero-title">Fitness Avatar Simulator</h1>
          <p className="home-hero-tagline">
            Your avatar leads, your webcam checks your form — right in the browser.
          </p>
        </div>

        <div className="home-hero-avatar">
          <Avatar3D exercise={HERO_EXERCISES[heroExerciseIndex]} playing speed={0.5} />
        </div>
      </section>

      <FadeInSection className="home-section">
        <h2 className="home-section-title">How it works</h2>
        <div className="home-how-grid">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.title} className="home-how-card">
              <div className="home-how-icon">{step.icon}</div>
              <h3 className="home-how-title">{step.title}</h3>
              <p className="home-how-desc">{step.description}</p>
            </div>
          ))}
        </div>
      </FadeInSection>

      <FadeInSection className="home-section">
        <h2 className="home-section-title">Quick instructions</h2>
        <ul className="home-instructions-list">
          {QUICK_INSTRUCTIONS.map((instruction) => (
            <li key={instruction} className="home-instruction-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="home-check-icon">
                <path d="M5 13l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
      </FadeInSection>

      <FadeInSection className="home-section home-final-cta">
        <h2 className="home-section-title">Ready to train smarter?</h2>
        <p className="home-final-cta-text">
          Start your first session and let your avatar guide the way.
        </p>
        <button type="button" className="home-cta-btn" onClick={handleGetStarted}>
          Get Started
        </button>
      </FadeInSection>
    </div>
  );
}
