import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Icon from '../components/Icon';
import './TutorialPage.css';

const STEPS = [
  {
    id: 'camera-setup',
    title: 'Camera setup',
    icon: 'camera',
    body: 'Set up your camera so your whole body is visible and well lit.',
    tips: [
      { icon: 'ruler', text: 'Place your device 2 to 3 metres away.' },
      { icon: 'person', text: 'Keep your full body in frame.' },
      { icon: 'sun', text: 'Use bright, even lighting.' },
    ],
  },
  {
    id: 'follow-avatar',
    title: 'Follow the avatar',
    icon: 'play-circle',
    body: 'Watch the demo first, then copy the movement.',
    tips: [
      { icon: 'eye', text: 'Watch the demo first.' },
      { icon: 'copy', text: 'Copy the movement.' },
      { icon: 'pause', text: 'Pause and slow motion are on the exercise screen.' },
    ],
  },
  {
    id: 'live-feedback',
    title: 'Live feedback',
    icon: 'message',
    body: 'Text messages appear while you move, colour-coded by what they mean.',
    tips: [
      { icon: 'check-circle', text: 'Green means your form is correct.' },
      { icon: 'alert-triangle', text: 'Red means fix this.' },
      { icon: 'info', text: 'Grey is a tip.' },
    ],
  },
  {
    id: 'rep-counting',
    title: 'Rep counting',
    icon: 'repeat',
    body: 'A rep counts only with correct form.',
    tips: [
      { icon: 'check', text: 'Good form, the rep counts.' },
      { icon: 'x-circle', text: 'Wrong form, the rep isn’t counted.' },
      { icon: 'redo', text: 'Redo it from the same count.' },
    ],
  },
  {
    id: 'safety',
    title: 'Safety notice',
    icon: 'shield',
    body: 'This app gives general guidance, not medical advice.',
    tips: [
      { icon: 'info', text: 'This is general guidance, not medical advice.' },
      { icon: 'stop', text: 'Stop if you feel pain.' },
      { icon: 'heart-pulse', text: 'Check with a doctor before a new routine.' },
    ],
  },
];

export default function TutorialPage({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const headingRef = useRef(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [safetyChecked, setSafetyChecked] = useState(false);

  // A Skip button only appears if the tutorial was already completed in an
  // earlier visit. Reading this once at mount keeps it from popping up
  // mid-flow if "Start training" is pressed during this same visit.
  const [canSkip] = useState(() => localStorage.getItem('fitness-avatar-tutorial-done') === 'true');

  const step = STEPS[stepIndex];
  const stepNumber = stepIndex + 1;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const progressPercent = (stepNumber / STEPS.length) * 100;

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  function handleBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function handleNext() {
    setStepIndex((current) => Math.min(STEPS.length - 1, current + 1));
  }

  function handleStartTraining() {
    localStorage.setItem('fitness-avatar-tutorial-done', 'true');
    navigate('/split');
  }

  function handleSkip() {
    navigate('/split');
  }

  return (
    <div className="tutorial-page">
      <TopBar theme={theme} toggleTheme={toggleTheme} />

      <div className="tutorial-body">
        <div className="tutorial-progress-track">
          <div className="tutorial-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="tutorial-step-count">
          Step {stepNumber} of {STEPS.length}
        </p>

        <div className="tutorial-card">
          <div className="tutorial-step-badge">
            <Icon name={step.icon} size={36} />
          </div>

          <h2 className="tutorial-step-title" ref={headingRef} tabIndex={-1}>
            {step.title}
          </h2>
          <p className="tutorial-step-body">{step.body}</p>

          <ul className="tutorial-tip-list">
            {step.tips.map((tip) => (
              <li key={tip.text} className="tutorial-tip-row">
                <Icon name={tip.icon} size={20} className="tutorial-tip-icon" />
                <span>{tip.text}</span>
              </li>
            ))}
          </ul>

          {step.id === 'safety' && (
            <label className="tutorial-safety-checkbox">
              <input
                type="checkbox"
                checked={safetyChecked}
                onChange={(event) => setSafetyChecked(event.target.checked)}
              />
              I understand this is general guidance, not medical advice, and I will stop if I feel pain.
            </label>
          )}
        </div>

        <div className="tutorial-nav">
          <div className="tutorial-nav-left">
            {!isFirstStep && (
              <button type="button" className="btn-secondary btn-md" onClick={handleBack}>
                <Icon name="arrow-left" size={18} />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="tutorial-nav-right">
            {canSkip && (
              <button type="button" className="btn-secondary btn-md" onClick={handleSkip}>
                Skip
              </button>
            )}

            {isLastStep ? (
              <>
                <button
                  type="button"
                  className="primary-button btn-md"
                  disabled={!safetyChecked}
                  onClick={handleStartTraining}
                >
                  Start training
                </button>
                {!safetyChecked && (
                  <p className="tutorial-disabled-hint">Tick the box above to enable Start training.</p>
                )}
              </>
            ) : (
              <button type="button" className="primary-button btn-md" onClick={handleNext}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
