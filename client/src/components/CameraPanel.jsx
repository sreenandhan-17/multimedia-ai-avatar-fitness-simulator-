import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { BODY_CONNECTIONS } from '../pose/landmarks';
import { extractPoseAngles } from '../pose/angles';
import { ExerciseTracker } from '../pose/exerciseTracker';
import './CameraPanel.css';

export default function CameraPanel({
  exercise,
  session,
  onPoseLandmarks,
  onPoseDetected,
  onCameraActiveChange,
  onNextExercise,
  onOpenTutorial,
  nextExercise,
  autoStartCamera = false,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const trackerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const runDetectionRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [fps, setFps] = useState(0);

  // User Detection & Greeting (Task 2)
  const presenceStartRef = useRef(null);
  const hasGreetedRef = useRef(false);
  const [greetingBanner, setGreetingBanner] = useState(null);

  // Dynamic Posture Correction Alerts (Task 4)
  const [activeAlert, setActiveAlert] = useState(null);
  const alertTimeoutRef = useRef(null);

  const [hudState, setHudState] = useState({
    liveCue: 'Step into frame to begin.',
    isFormValid: true,
    activeAngle: 180,
    secondaryAngle: 180,
    coreAngle: 180,
    activeAngleLabel: 'Angle',
    secondaryAngleLabel: 'Hip',
    stage: 'STANDBY',
    anglesDisabled: false,
    visibilityWarning: false,
    notInPositionWarning: false,
    isPlankValid: false,
    postureLabel: 'Standby',
    torsoTiltDeg: 0,
  });

  const fpsCount = useRef(0);
  const lastFpsTime = useRef(0);
  const lastVideoTime = useRef(-1);

  const exerciseId = exercise?.id || 'push-up';

  // Stable session reference to prevent resetting tracker on timer ticks
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Handle Posture Alert Callback
  const handlePostureAlert = useCallback((alertData) => {
    setActiveAlert(alertData);
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    alertTimeoutRef.current = setTimeout(() => {
      setActiveAlert(null);
    }, 3200);
  }, []);

  // Initialize ExerciseTracker (Task 3: 4-stage FSM)
  useEffect(() => {
    const handleRep = (repData) => {
      if (sessionRef.current && sessionRef.current.reportRep) {
        sessionRef.current.reportRep(repData);
      }
    };

    trackerRef.current = new ExerciseTracker(handleRep, exerciseId, handlePostureAlert);
    hasGreetedRef.current = false;
    presenceStartRef.current = null;

    return () => {
      if (trackerRef.current) {
        trackerRef.current.reset();
      }
    };
  }, [exerciseId, handlePostureAlert]);

  // Update exercise profile if exerciseId changes
  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.setExercise(exerciseId);
    }
  }, [exerciseId]);

  // Notify parent of camera active state
  useEffect(() => {
    if (onCameraActiveChange) {
      onCameraActiveChange(cameraActive);
    }
  }, [cameraActive, onCameraActiveChange]);

  // Format mm:ss helper
  const formatTime = (totalSeconds = 0) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load MediaPipe PoseLandmarker model
  const initPoseLandmarker = async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    setModelLoading(true);
    try {
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch (localWasmErr) {
        console.warn('Local WASM fallback to CDN:', localWasmErr);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );
      }

      let landmarker;
      try {
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      } catch (gpuErr) {
        console.warn('GPU delegate fallback to CPU:', gpuErr);
        landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/pose_landmarker_lite.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      landmarkerRef.current = landmarker;
      setModelLoading(false);
      return landmarker;
    } catch (err) {
      console.error('Failed to initialize MediaPipe PoseLandmarker:', err);
      setModelLoading(false);
      throw err;
    }
  };

  // Animation and detection processing loop
  useEffect(() => {
    runDetectionRef.current = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      animFrameIdRef.current = requestAnimationFrame(() => {
        if (runDetectionRef.current) runDetectionRef.current();
      });

      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) {
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // 1. Render mirrored video feed onto canvas (gym mirror)
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      // Measure FPS
      fpsCount.current += 1;
      const now = Date.now();
      if (lastFpsTime.current === 0) lastFpsTime.current = now;
      if (now - lastFpsTime.current >= 1000) {
        setFps(fpsCount.current);
        fpsCount.current = 0;
        lastFpsTime.current = now;
      }

      // 2. Feed frames through MediaPipe Pose locally
      const landmarker = landmarkerRef.current;
      let detectedLandmarks = null;

      if (landmarker && video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;
        try {
          const startTimeMs = performance.now();
          const results = landmarker.detectForVideo(video, startTimeMs);
          if (results && results.landmarks && results.landmarks.length > 0) {
            detectedLandmarks = results.landmarks[0];
          }
        } catch (detectErr) {
          console.warn('Frame detection warning:', detectErr);
        }
      }

      // 3. Draw Body Skeleton & Joint Dots in Cyan (#00e5ff)
      // Task 1: FILTER OUT FACE LANDMARKS (indices 0 - 10)
      if (detectedLandmarks && detectedLandmarks.length > 0) {
        // Draw restricted skeleton lines in cyan (#00e5ff)
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;

        BODY_CONNECTIONS.forEach(([startIdx, endIdx]) => {
          if (startIdx < 11 || endIdx < 11) return;

          const p1 = detectedLandmarks[startIdx];
          const p2 = detectedLandmarks[endIdx];

          if (p1 && p2 && (p1.visibility ?? 1) > 0.25 && (p2.visibility ?? 1) > 0.25) {
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
          }
        });

        // Draw joint dots in cyan (#00e5ff) strictly for body landmarks (idx >= 11)
        detectedLandmarks.forEach((p, idx) => {
          if (idx < 11) return;

          if ((p.visibility ?? 1) > 0.25) {
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#00e5ff';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 10;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fill();
          }
        });

        ctx.restore();

        // 4. Calculate angles & check presence (Task 2 & Task 4)
        const angles = extractPoseAngles(detectedLandmarks, exerciseId);

        // Task 2: User Detection & Greeting check (shoulders & hips >= 0.70 for 1.5s)
        if (angles.essentialDetected) {
          if (presenceStartRef.current === null) {
            presenceStartRef.current = Date.now();
          } else if (Date.now() - presenceStartRef.current >= 1500) {
            if (!hasGreetedRef.current) {
              hasGreetedRef.current = true;
              setGreetingBanner('🎉 Body Detected! Get into position to start.');
              setTimeout(() => {
                setGreetingBanner(null);
              }, 4000);
            }
          }
        } else {
          presenceStartRef.current = null;
        }

        // Advance 4-state motion tracking machine (Task 3)
        if (trackerRef.current) {
          const trackingInfo = trackerRef.current.processFrame(angles, detectedLandmarks);
          setHudState(trackingInfo);
        }

        // Pass coordinates to callbacks
        if (onPoseLandmarks) {
          onPoseLandmarks(detectedLandmarks);
        }
        if (onPoseDetected) {
          onPoseDetected(detectedLandmarks);
        }
        if (sessionRef.current && sessionRef.current.updatePoseLandmarks) {
          sessionRef.current.updatePoseLandmarks(detectedLandmarks);
        }
      } else {
        ctx.restore();
      }
    };
  }, [isMirrored, exerciseId, onPoseLandmarks, onPoseDetected]);

  // Start Webcam
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      await initPoseLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch (e) {
            console.warn('Video play warning:', e);
          }
        };

        try {
          await video.play();
        } catch {
          // Play will proceed when metadata loads
        }
      }

      setCameraActive(true);

      if (trackerRef.current) {
        trackerRef.current.reset();
      }

      hasGreetedRef.current = false;
      presenceStartRef.current = null;

      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (runDetectionRef.current) {
        runDetectionRef.current();
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      let userMsg = 'Unable to access camera. Please allow camera permissions in your browser.';
      if (err.name === 'NotAllowedError') {
        userMsg = 'Camera permission was denied. Please allow camera access in your browser bar.';
      } else if (err.name === 'NotFoundError') {
        userMsg = 'No camera device found on this system.';
      }
      setErrorMessage(userMsg);
      setCameraActive(false);
    }
  };

  // Auto-start camera if triggered by parent Tutorial view
  useEffect(() => {
    if (autoStartCamera && !cameraActive) {
      startCamera();
    }
  }, [autoStartCamera]);

  // Stop Webcam (clean shutdown)
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setCameraActive(false);
    setFps(0);
    fpsCount.current = 0;
    lastVideoTime.current = -1;
    hasGreetedRef.current = false;
    presenceStartRef.current = null;
    setGreetingBanner(null);
    setActiveAlert(null);

    if (trackerRef.current) {
      trackerRef.current.reset();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  // Dynamic accuracy display & tint tier (Task 2 & 3)
  const displayAccuracy = session?.accuracy ?? hudState?.runningAccuracy ?? 100;
  const accuracyTierClass =
    displayAccuracy >= 90
      ? 'acc-high'
      : displayAccuracy >= 75
      ? 'acc-mid'
      : 'acc-low';

  // Guidance text prioritizing rest interval
  const currentGuidance = session?.isResting
    ? `Rest period: ${session.restRemaining}s remaining. Shake out and breathe!`
    : hudState.liveCue || session?.feedback || 'Follow the avatar demo.';

  return (
    <div className={`camera-panel-container ${cameraActive ? 'fullscreen-mode' : ''}`}>
      {/* Hidden persistent video element for streaming frames */}
      <video
        ref={videoRef}
        className="camera-video-hidden"
        playsInline
        muted
        autoPlay
      />

      {/* Floating Header Overlay (Visible when camera is active) */}
      {cameraActive && (
        <header className="camera-floating-header">
          <div className="camera-header-info">
            <span className="camera-exercise-name">{exercise?.name || 'Workout'}</span>
            <span className="camera-bodypart-badge">{exercise?.bodyPart || 'Form Tracking'}</span>
            <span className="camera-live-indicator active">
              {fps > 0 ? `🟢 LIVE (${fps} FPS)` : '🟢 LIVE'}
            </span>
          </div>

          <div className="camera-floating-actions">
            {onOpenTutorial && (
              <button
                type="button"
                className="cam-btn cam-btn-tutorial"
                onClick={onOpenTutorial}
                title="Open 3D Avatar Form Guide"
              >
                📖 Form Guide
              </button>
            )}
            <button
              type="button"
              className="cam-btn"
              onClick={() => setIsMirrored((prev) => !prev)}
              title="Toggle Mirror View"
            >
              {isMirrored ? '🪞 Mirrored' : '↔ Normal'}
            </button>
            <button
              type="button"
              className="cam-btn cam-btn-stop"
              onClick={stopCamera}
            >
              ⏹ Turn Off Camera
            </button>
          </div>
        </header>
      )}

      {/* Standby Header Row (when camera is offline) */}
      {!cameraActive && (
        <div className="camera-header-row">
          <div className="camera-title-group">
            <h4 className="m-0 font-bold text-sm">Live Webcam Pose Analysis</h4>
            <span className="camera-live-indicator">🔴 OFFLINE</span>
          </div>

          <div className="camera-controls-group">
            <button
              type="button"
              className="cam-btn cam-btn-start"
              onClick={startCamera}
              disabled={modelLoading}
            >
              {modelLoading ? '⏳ Loading AI Model...' : '📷 Turn On Camera'}
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && <div className="camera-error-banner">{errorMessage}</div>}

      {/* Viewport Area */}
      {cameraActive ? (
        <div className="camera-viewport-fullscreen">
          <canvas
            ref={canvasRef}
            className="camera-canvas-fullscreen"
          />

          {/* Top Joint Angle Metric Pills */}
          <div className="camera-top-metrics">
            <span className={`camera-angle-pill ${hudState.anglesDisabled ? 'disabled' : ''}`}>
              {hudState.activeAngleLabel}: {hudState.anglesDisabled ? '--' : `${hudState.activeAngle}°`}
            </span>
            {hudState.secondaryAngleLabel && (
              <span className={`camera-angle-pill secondary ${hudState.anglesDisabled ? 'disabled' : ''}`}>
                {hudState.secondaryAngleLabel}: {hudState.anglesDisabled ? '--' : `${hudState.secondaryAngle}°`}
              </span>
            )}
            <span className={`camera-angle-pill core ${hudState.anglesDisabled ? 'disabled' : ''}`}>
              Core: {hudState.anglesDisabled ? '--' : `${hudState.coreAngle}°`}
            </span>
            {exerciseId === 'push-up' && (
              <span
                className={`camera-angle-pill posture ${
                  hudState.isPlankValid ? 'plank-valid' : 'plank-invalid'
                }`}
              >
                Posture: {hudState.postureLabel || (hudState.isPlankValid ? 'Plank' : 'Upright')}
              </span>
            )}
          </div>

          {/* Task 1: Full-width Overlay Warning Banner (Mandatory Landmark Visibility Gate) */}
          {hudState.visibilityWarning && (
            <div className="camera-visibility-overlay-banner" role="alert">
              <div className="warning-banner-content">
                <span className="warning-banner-icon">⚠️</span>
                <span className="warning-banner-text">
                  Full body not detected. Step back until your shoulders, arms, and hips are clearly visible in plank position.
                </span>
              </div>
            </div>
          )}

          {/* Task 2: Full-width Position Guidance Banner when upright/seated during push-ups */}
          {!hudState.visibilityWarning && hudState.notInPositionWarning && (
            <div className="camera-position-overlay-banner" role="status">
              <div className="position-banner-content">
                <span className="position-banner-icon">🧘</span>
                <span className="position-banner-text">
                  Get into a plank on the floor to start push-ups.
                </span>
              </div>
            </div>
          )}

          {/* Task 2: User Detection & Greeting Banner */}
          {greetingBanner && (
            <div className="camera-greeting-toast" role="status" aria-live="polite">
              <span className="greeting-icon">👋</span>
              <span className="greeting-text">{greetingBanner}</span>
            </div>
          )}

          {/* Task 4: Dynamic Posture Correction Alerts & Popups */}
          {activeAlert && (
            <div className="camera-posture-alert-toast" role="alert">
              <div className="alert-icon-circle">{activeAlert.icon}</div>
              <div className="alert-content">
                <div className="alert-header">
                  <span className="alert-tag">{activeAlert.part}</span>
                  <span className="alert-title">{activeAlert.title}</span>
                </div>
                <p className="alert-message">{activeAlert.message}</p>
              </div>
            </div>
          )}

          {/* Task 2: Fixed/Pinned Heads-Up Display (HUD) at the Bottom */}
          <div className="camera-bottom-hud">
            {/* Live Guidance Banner */}
            <div className={`camera-hud-guidance ${hudState.isFormValid ? 'good' : 'warning'} ${session?.isResting ? 'resting' : ''}`}>
              <span className="guidance-icon">
                {session?.isResting ? '⏳' : hudState.isFormValid ? '✓' : '⚠️'}
              </span>
              <span className="guidance-text">{currentGuidance}</span>
              {session?.isResting && (
                <button
                  type="button"
                  className="hud-skip-rest-btn"
                  onClick={session.skipRest}
                >
                  Skip Rest →
                </button>
              )}
            </div>

            {/* Pinned 4-Stat Metric Cards */}
            <div className="camera-hud-stats-grid">
              <div className="hud-stat-tile">
                <span className="hud-stat-label">REPS</span>
                <span className="hud-stat-value highlight">
                  {session?.currentReps ?? 0} <span className="hud-stat-target">/ {session?.targetReps ?? 15}</span>
                </span>
              </div>

              <div className="hud-stat-tile">
                <span className="hud-stat-label">SET</span>
                <span className="hud-stat-value">
                  {session?.currentSet ?? 1} <span className="hud-stat-target">/ {session?.targetSets ?? 3}</span>
                </span>
              </div>

              <div className="hud-stat-tile">
                <span className="hud-stat-label">TIMER</span>
                <span className="hud-stat-value">
                  {formatTime(session?.elapsedSeconds ?? 0)}
                </span>
              </div>

              <div
                className={`hud-stat-tile accuracy-tile ${accuracyTierClass} ${
                  activeAlert ? 'has-alert' : ''
                }`}
              >
                <span className="hud-stat-label">ACCURACY</span>
                <span className="hud-stat-value">
                  {displayAccuracy}%
                </span>
              </div>
            </div>
          </div>

          {/* 30-Second Rest Break Pop-up Message */}
          {session?.isResting && (
            <div className="camera-rest-overlay">
              <div className="camera-rest-modal">
                <span className="camera-rest-badge">🎉 Set {session.currentSet} Complete!</span>
                <h2 className="camera-rest-title">30-Second Rest Break</h2>
                <p className="camera-rest-subtitle">
                  Catch your breath and hydrate. Set {session.currentSet + 1} of {session.targetSets} starts automatically!
                </p>

                <div className="camera-rest-timer-box">
                  <div className="camera-rest-seconds">{session.restRemaining}s</div>
                  <span className="camera-rest-caption">Remaining</span>
                </div>

                <div className="camera-rest-progress-track">
                  <div
                    className="camera-rest-progress-bar"
                    style={{ width: `${Math.max(0, Math.min(100, ((30 - session.restRemaining) / 30) * 100))}%` }}
                  />
                </div>

                <button
                  type="button"
                  className="camera-rest-action-btn"
                  onClick={session.skipRest}
                >
                  Skip Rest & Start Set {session.currentSet + 1} Now →
                </button>
              </div>
            </div>
          )}

          {/* Task 5: Workout Complete Pop-up Modal with Progression Workflow */}
          {session?.isFinished && (
            <div className="camera-rest-overlay">
              <div className="camera-rest-modal celebration-modal">
                <span className="camera-rest-badge celebration">🏆 Workout Complete!</span>
                <h2 className="camera-rest-title">All 3 Sets Finished! 🎉</h2>
                <p className="camera-rest-subtitle">
                  Outstanding job! You completed all 3 sets ({session.targetSets * session.targetReps} reps total) of {exercise?.name || 'the exercise'}.
                </p>

                <div className="camera-summary-grid">
                  <div className="camera-summary-card">
                    <span className="camera-summary-label">TOTAL REPS</span>
                    <span className="camera-summary-val">{session.totalGoodReps}</span>
                  </div>
                  <div className="camera-summary-card">
                    <span className="camera-summary-label">SETS COMPLETED</span>
                    <span className="camera-summary-val">{session.targetSets} / {session.targetSets}</span>
                  </div>
                  <div className="camera-summary-card">
                    <span className="camera-summary-label">FORM ACCURACY</span>
                    <span className="camera-summary-val">{session.accuracy}%</span>
                  </div>
                  <div className="camera-summary-card">
                    <span className="camera-summary-label">DURATION</span>
                    <span className="camera-summary-val">{formatTime(session.elapsedSeconds)}</span>
                  </div>
                </div>

                <div className="camera-modal-btn-row">
                  {nextExercise && (
                    <button
                      type="button"
                      className="camera-rest-action-btn next-exercise-btn"
                      onClick={() => {
                        stopCamera();
                        if (onNextExercise) {
                          onNextExercise(nextExercise.id);
                        }
                      }}
                    >
                      Next Exercise Tutorial: {nextExercise.name} →
                    </button>
                  )}
                  <button
                    type="button"
                    className="camera-rest-action-btn secondary"
                    onClick={session.restartWorkout}
                  >
                    Do It Again
                  </button>
                  <button
                    type="button"
                    className="camera-rest-action-btn tertiary"
                    onClick={stopCamera}
                  >
                    Exit Workout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="camera-standby-box">
          <span className="camera-standby-icon">📹</span>
          <h5 className="camera-standby-title">Live Posture Tracking Ready</h5>
          <p className="camera-standby-desc">
            Allow camera access to automatically track your repetitions, measure joint angles,
            and receive live form correction in a full-screen gym mirror view.
          </p>
          <button
            type="button"
            className="cam-btn cam-btn-start"
            onClick={startCamera}
            disabled={modelLoading}
          >
            {modelLoading ? '⏳ Initializing Pose Model...' : '📷 Start Webcam Tracking'}
          </button>
        </div>
      )}
    </div>
  );
}
