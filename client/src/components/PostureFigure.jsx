import { useEffect, useRef, useState } from 'react';
import './PostureFigure.css';

// A simple stick figure driven by joint-angle data from exercises.json.
// Four angle knobs (torso, arm, thigh, shin) plus a vertical body shift
// are enough to approximate every exercise's start/end pose. Only
// posture.animated exercises actually loop; the rest just show the end
// pose, same as a reduced-motion user sees for every exercise.
export default function PostureFigure({ posture, className = '' }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  const [prefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [showEnd, setShowEnd] = useState(false);

  const shouldAnimate = posture.animated && !prefersReducedMotion;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldAnimate || !isVisible) {
      return;
    }

    const halfCycleMs = posture.loopTimeMs / 2;
    const intervalId = setInterval(() => {
      setShowEnd((current) => !current);
    }, halfCycleMs);

    return () => clearInterval(intervalId);
  }, [shouldAnimate, isVisible, posture.loopTimeMs]);

  // Non-animated exercises and reduced motion both just show the end pose.
  const pose = shouldAnimate && showEnd ? posture.end : shouldAnimate ? posture.start : posture.end;
  const transitionMs = shouldAnimate ? posture.loopTimeMs / 2 : 0;
  const transition = `transform ${transitionMs}ms ease-in-out`;

  return (
    <div className={`posture-figure ${className}`} ref={containerRef} aria-hidden="true">
      <svg viewBox="0 0 200 300" className="posture-figure-svg">
        <g style={{ transform: `translateY(${pose.bodyShiftY}px)`, transition }}>
          <circle cx="100" cy="40" r="18" className="posture-head" />

          <line
            x1="100"
            y1="58"
            x2="100"
            y2="130"
            className="posture-limb"
            style={{ transform: `rotate(${pose.torso}deg)`, transformOrigin: '100px 130px', transition }}
          />

          <line
            x1="100"
            y1="75"
            x2="60"
            y2="95"
            className="posture-limb"
            style={{ transform: `rotate(${pose.arm}deg)`, transformOrigin: '100px 75px', transition }}
          />
          <line
            x1="100"
            y1="75"
            x2="140"
            y2="95"
            className="posture-limb"
            style={{ transform: `rotate(${-pose.arm}deg)`, transformOrigin: '100px 75px', transition }}
          />

          <g style={{ transform: `rotate(${pose.thigh}deg)`, transformOrigin: '100px 130px', transition }}>
            <line x1="100" y1="130" x2="85" y2="190" className="posture-limb" />
            <g style={{ transform: `rotate(${pose.shin}deg)`, transformOrigin: '85px 190px', transition }}>
              <line x1="85" y1="190" x2="85" y2="250" className="posture-limb" />
            </g>
          </g>

          <g style={{ transform: `rotate(${-pose.thigh}deg)`, transformOrigin: '100px 130px', transition }}>
            <line x1="100" y1="130" x2="115" y2="190" className="posture-limb" />
            <g style={{ transform: `rotate(${-pose.shin}deg)`, transformOrigin: '115px 190px', transition }}>
              <line x1="115" y1="190" x2="115" y2="250" className="posture-limb" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
