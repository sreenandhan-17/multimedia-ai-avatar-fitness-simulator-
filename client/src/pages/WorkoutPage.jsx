import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Avatar3D from '../components/Avatar3D';
import CameraPanel from '../components/CameraPanel';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import exercisesData from '../data/exercises.json';
import { getCheckpointsForExercise } from '../data/formCheckpoints';
import './WorkoutPage.css';

export default function WorkoutPage({ theme, toggleTheme }) {
  const { exerciseId } = useParams();
  const navigate = useNavigate();

  // Find exercise definition
  const exercise = useMemo(() => {
    return (
      exercisesData.exercises.find((e) => e.id === exerciseId) || {
        id: exerciseId,
        name: exerciseId ? exerciseId.replace('-', ' ') : 'Exercise',
        bodyPart: 'Chest',
        day: 'day-1',
        instructions: [
          'Maintain steady posture throughout the exercise',
          'Follow the animated avatar rhythm',
          'Breathe smoothly on exertion',
        ],
      }
    );
  }, [exerciseId]);

  // Find next exercise for progression workflow (Task 5)
  const nextExercise = useMemo(() => {
    const list = exercisesData.exercises;
    const currentIndex = list.findIndex((e) => e.id === exercise.id);
    const nextIdx = (currentIndex + 1) % list.length;
    return list[nextIdx];
  }, [exercise.id]);

  // Form checkpoints for current exercise (Task 1)
  const checkpoints = useMemo(() => {
    return getCheckpointsForExercise(exercise.id);
  }, [exercise.id]);

  // Gender selection (persisted in localStorage)
  const [gender, setGender] = useState(() => {
    return localStorage.getItem('fitness-avatar-gender') || 'female';
  });

  const handleGenderChange = (newGender) => {
    setGender(newGender);
    localStorage.setItem('fitness-avatar-gender', newGender);
  };

  // Avatar playback controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  // Camera & Tutorial View States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [autoStartCamera, setAutoStartCamera] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);

  // Workout Session State Hook (Phase 4 & Task 5: 3 sets of 15 reps, 30s rest)
  const session = useWorkoutSession({
    exerciseId: exercise.id,
    targetSets: 3,
    targetReps: 15,
    restDuration: 30,
  });

  // Format MM:SS for timer
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Transition smoothly from Tutorial to Live Camera view (Task 1)
  const handleStartExercise = () => {
    setAutoStartCamera(true);
  };

  // Cycle to next exercise tutorial (Task 5)
  const handleNextExercise = (nextId) => {
    setAutoStartCamera(false);
    setIsCameraActive(false);
    session.restartWorkout();
    navigate(`/workout/${nextId}`);
  };

  return (
    <div className={`workout-page ${isCameraActive ? 'camera-view-active' : ''}`}>
      {!isCameraActive && <TopBar theme={theme} toggleTheme={toggleTheme} />}

      <main className="workout-container">
        {/* Navigation Breadcrumb & Exercise Header (shown in Tutorial View) */}
        {!isCameraActive && (
          <div className="workout-header">
            <Link to={`/split/${exercise.day}`} className="workout-back-link">
              ← Back to Exercises
            </Link>

            <div className="workout-title-row">
              <div>
                <h1 className="workout-title">{exercise.name}</h1>
                <p className="workout-subtitle">Interactive 3D Avatar Tutorial & Form Guide</p>
              </div>
              <span className="workout-badge">{exercise.bodyPart}</span>
            </div>
          </div>
        )}

        {/* Task 1: Exercise Intro & 3D Avatar Tutorial View (before camera starts) */}
        {!isCameraActive && (
          <div className="tutorial-intro-layout">
            <div className="tutorial-avatar-column">
              <div className="avatar-display-card tutorial-card">
                <div className="avatar-top-controls">
                  {/* Gender Selector Toggle (Task 1) */}
                  <div className="avatar-gender-selector" aria-label="Select Avatar Gender">
                    <button
                      type="button"
                      className={`gender-btn ${gender === 'female' ? 'active' : ''}`}
                      onClick={() => handleGenderChange('female')}
                    >
                      👩 Female Avatar
                    </button>
                    <button
                      type="button"
                      className={`gender-btn ${gender === 'male' ? 'active' : ''}`}
                      onClick={() => handleGenderChange('male')}
                    >
                      👨 Male Avatar
                    </button>
                  </div>
                </div>

                {/* Animated 3D Avatar Viewport */}
                <div className="avatar-viewport">
                  <Avatar3D
                    exercise={exercise.id}
                    gender={gender}
                    playing={isPlaying}
                    speed={speed}
                  />
                </div>

                {/* Playback Controls */}
                <div className="avatar-playback-bar">
                  <button
                    type="button"
                    className="playback-play-btn"
                    onClick={() => setIsPlaying((prev) => !prev)}
                  >
                    {isPlaying ? '⏸ Pause Loop' : '▶ Play Loop'}
                  </button>

                  <div className="playback-speed-group" aria-label="Playback Speed">
                    {[0.5, 1, 2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`speed-btn ${speed === s ? 'active' : ''}`}
                        onClick={() => setSpeed(s)}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Form Checkpoints & Start Exercise CTA */}
            <div className="tutorial-checkpoints-column">
              <div className="checkpoints-container-card">
                <div className="checkpoints-card-header">
                  <span className="checkpoints-header-tag">Biomechanical Guide</span>
                  <h2 className="checkpoints-card-title">Key Visual Form Checkpoints</h2>
                  <p className="checkpoints-card-desc">
                    Study these form benchmarks demonstrated by the avatar before beginning your sets.
                  </p>
                </div>

                {/* Form Checkpoints Grid */}
                <div className="form-checkpoints-grid">
                  {checkpoints.map((cp) => (
                    <div key={cp.id} className="form-checkpoint-tile">
                      <div className="checkpoint-icon-badge">{cp.icon}</div>
                      <div className="checkpoint-info">
                        <h4 className="checkpoint-title">{cp.title}</h4>
                        <p className="checkpoint-summary">{cp.summary}</p>
                        <span className="checkpoint-detail">{cp.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Task 1: Primary "Start Exercise" Action Button */}
                <div className="tutorial-action-row">
                  <button
                    type="button"
                    className="start-exercise-btn"
                    onClick={handleStartExercise}
                  >
                    🚀 Start Exercise (Turn On Camera)
                  </button>
                  <p className="tutorial-action-note">
                    Webcam analysis runs 100% locally in your browser with zero latency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Camera Panel & HUD (Always mounted so video streams cleanly) */}
        <CameraPanel
          exercise={exercise}
          session={session}
          onCameraActiveChange={setIsCameraActive}
          onNextExercise={handleNextExercise}
          onOpenTutorial={() => setIsTutorialModalOpen(true)}
          nextExercise={nextExercise}
          autoStartCamera={autoStartCamera}
          onPoseLandmarks={(landmarks) => {
            if (session.updatePoseLandmarks) {
              session.updatePoseLandmarks(landmarks);
            }
          }}
        />

        {/* Task 1: 3D Avatar Tutorial Modal (accessible anytime while in workout via floating header) */}
        {isTutorialModalOpen && (
          <div className="workout-modal-overlay tutorial-modal-overlay" style={{ zIndex: 2500 }}>
            <div className="workout-modal-card tutorial-modal-dialog">
              <div className="modal-header-row">
                <div>
                  <h3 className="modal-heading">{exercise.name} Form Guide</h3>
                  <span className="modal-subheading">Interactive 3D Posture Reference</span>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsTutorialModalOpen(false)}
                  aria-label="Close form guide"
                >
                  ✕
                </button>
              </div>

              {/* 3D Demo Viewport */}
              <div className="modal-avatar-viewport">
                <Avatar3D
                  exercise={exercise.id}
                  gender={gender}
                  playing={isPlaying}
                  speed={speed}
                />
              </div>

              {/* Form Checkpoints List */}
              <div className="modal-checkpoints-list">
                {checkpoints.map((cp) => (
                  <div key={cp.id} className="modal-checkpoint-row">
                    <span className="modal-cp-icon">{cp.icon}</span>
                    <div>
                      <strong className="modal-cp-title">{cp.title}:</strong>{' '}
                      <span className="modal-cp-text">{cp.summary}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="modal-btn modal-btn-primary"
                onClick={() => setIsTutorialModalOpen(false)}
              >
                Back to Workout
              </button>
            </div>
          </div>
        )}

        {/* Workout Complete Summary Modal (Offline fallback view) */}
        {!isCameraActive && session.isFinished && (
          <div className="workout-modal-overlay" style={{ zIndex: 2000 }}>
            <div className="workout-modal-card">
              <span className="camera-rest-badge celebration">🏆 Workout Complete!</span>
              <h2>All 3 Sets Finished! 🎉</h2>
              <p>Great job finishing your {exercise.name} sets!</p>

              <div className="summary-stats-grid">
                <div className="summary-stat-box">
                  <span className="summary-stat-label">Total Reps</span>
                  <div className="summary-stat-val">{session.totalGoodReps}</div>
                </div>
                <div className="summary-stat-box">
                  <span className="summary-stat-label">Sets Completed</span>
                  <div className="summary-stat-val">{session.targetSets}</div>
                </div>
                <div className="summary-stat-box">
                  <span className="summary-stat-label">Form Accuracy</span>
                  <div className="summary-stat-val">{session.accuracy}%</div>
                </div>
                <div className="summary-stat-box">
                  <span className="summary-stat-label">Total Time</span>
                  <div className="summary-stat-val">{formatTime(session.elapsedSeconds)}</div>
                </div>
              </div>

              <div className="modal-actions-row">
                {nextExercise && (
                  <button
                    type="button"
                    className="modal-btn modal-btn-primary next-exercise-btn"
                    onClick={() => handleNextExercise(nextExercise.id)}
                  >
                    Next Exercise Tutorial: {nextExercise.name} →
                  </button>
                )}
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={session.restartWorkout}
                >
                  Do It Again
                </button>
                <button
                  type="button"
                  className="modal-btn modal-btn-secondary"
                  onClick={() => navigate(`/split/${exercise.day}`)}
                >
                  Back to Exercises
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
