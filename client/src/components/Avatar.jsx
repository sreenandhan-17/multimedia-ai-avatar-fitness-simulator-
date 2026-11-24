import './Avatar.css';

// Animated SVG avatar demonstrating exercise form.
// Supports exercise types ('push-up', 'squat'), playback speed,
// play/pause state, and a Gender selection ('female' | 'male').
export default function Avatar({
  exercise = 'squat',
  gender = 'female',
  size = 'medium',
  className = '',
  playing = true,
  speed = 1,
}) {
  const sizeClass = `avatar-${size}`;
  const genderClass = `avatar-${gender}`;

  // Slower speed (e.g. 0.5x) stretches loop duration; CSS variables let
  // inline controls change playback speed and play/pause on the fly.
  const avatarStyle = {
    '--avatar-duration': `${2.8 / speed}s`,
    '--avatar-play-state': playing ? 'running' : 'paused',
  };

  const isPushUp = exercise === 'push-up';

  return (
    <div
      className={`avatar ${sizeClass} ${genderClass} ${className}`}
      style={avatarStyle}
      aria-hidden="true"
    >
      {isPushUp ? (
        <svg viewBox="0 0 320 220" className="avatar-figure avatar-push-up">
          {/* Ground floor guide */}
          <line x1="20" y1="180" x2="300" y2="180" className="avatar-floor-line" />

          {/* Sinking plank body */}
          <g className="avatar-pushup-body">
            {/* Head & Gender Hair */}
            <circle className="avatar-head" cx="240" cy="85" r="16" />
            {gender === 'female' ? (
              <circle className="avatar-hair-bun" cx="254" cy="80" r="7" />
            ) : (
              <path
                d="M 226 78 Q 240 68 252 76"
                className="avatar-hair-male"
              />
            )}

            {/* Neck to Torso */}
            <line x1="226" y1="92" x2="140" y2="108" className="avatar-limb avatar-torso" />

            {/* Legs & Core: Straight plank line to feet */}
            <line x1="140" y1="108" x2="60" y2="124" className="avatar-limb avatar-legs" />

            {/* Planted Toes */}
            <line x1="60" y1="124" x2="52" y2="180" className="avatar-limb avatar-toes" />

            {/* Upper Arm: connects from shoulder to elbow */}
            <line x1="218" y1="96" x2="218" y2="142" className="avatar-limb avatar-pushup-upperarm" />
            {/* Forearm: connects from elbow to hands planted on floor */}
            <line x1="218" y1="142" x2="218" y2="180" className="avatar-limb avatar-pushup-forearm" />

            {/* Planted Hand Palm */}
            <line x1="208" y1="180" x2="228" y2="180" className="avatar-hand-palm" />
          </g>
        </svg>
      ) : (
        /* Upright / Squat SVG */
        <svg viewBox="0 0 200 300" className={`avatar-figure avatar-${exercise}`}>
          <g className="avatar-body">
            <circle className="avatar-head" cx="100" cy="40" r="18" />
            {gender === 'female' ? (
              <circle className="avatar-hair-bun" cx="116" cy="34" r="7" />
            ) : (
              <path d="M 86 32 Q 100 22 114 30" className="avatar-hair-male" />
            )}

            <line x1="100" y1="58" x2="100" y2="130" className="avatar-limb" />

            {/* Arms held out for balance */}
            <line x1="100" y1="75" x2="60" y2="95" className="avatar-limb avatar-arm-left" />
            <line x1="100" y1="75" x2="140" y2="95" className="avatar-limb avatar-arm-right" />

            {/* Left leg */}
            <g className="avatar-thigh-left" style={{ transformOrigin: '100px 130px' }}>
              <line x1="100" y1="130" x2="85" y2="190" className="avatar-limb" />
              <g className="avatar-shin-left" style={{ transformOrigin: '85px 190px' }}>
                <line x1="85" y1="190" x2="85" y2="250" className="avatar-limb" />
              </g>
            </g>

            {/* Right leg */}
            <g className="avatar-thigh-right" style={{ transformOrigin: '100px 130px' }}>
              <line x1="100" y1="130" x2="115" y2="190" className="avatar-limb" />
              <g className="avatar-shin-right" style={{ transformOrigin: '115px 190px' }}>
                <line x1="115" y1="190" x2="115" y2="250" className="avatar-limb" />
              </g>
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
