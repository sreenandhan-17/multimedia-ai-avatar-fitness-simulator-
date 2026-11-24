import React from 'react';
import {
  Activity,
  Flame,
  Zap,
  Dumbbell,
  Maximize2,
  RotateCcw,
  Camera,
  HeartPulse,
  Sliders,
  Move,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Compass,
  Play,
  Video,
  Gauge
} from 'lucide-react';
import { EXERCISE_CATALOG } from '../utils/poseGeometry';
import { FSM_STATE } from '../utils/motionStateMachine';

export default function FitnessHUD({
  muscleMass,
  setMuscleMass,
  bodyFat,
  setBodyFat,
  heightScale,
  setHeightScale,
  activePose,
  setActivePose,
  cameraPreset,
  setCameraPreset,
  modelStatus,
  onReset,
  // Step 3 state props
  trackingMode,
  setTrackingMode,
  fsmState,
  liveAngles,
  selectedExercise,
  setSelectedExercise,
  onResetWorkout,
  isTracking,
}) {
  // Estimated physiological indicators
  const estimatedWeightKg = Math.round(72 * heightScale + (muscleMass - 50) * 0.45 + (bodyFat - 15) * 0.55);
  const heightCm = Math.round(180 * heightScale);
  const heightMeters = heightCm / 100;
  const bmi = (estimatedWeightKg / (heightMeters * heightMeters)).toFixed(1);
  const estimatedBMR = Math.round(10 * estimatedWeightKg + 6.25 * heightCm - 5 * 25 + 5);
  const leanBodyMassKg = (estimatedWeightKg * (1 - bodyFat / 100)).toFixed(1);

  const angles = liveAngles || {
    leftElbow: 165,
    rightElbow: 165,
    leftKnee: 175,
    rightKnee: 175,
    leftShoulder: 25,
    rightShoulder: 25,
  };

  const safeFsm = fsmState || {
    currentState: FSM_STATE.STATE_0_NEUTRAL,
    stateLabel: 'State 0: Neutral / Standing',
    repCount: 0,
    caloriesBurned: 0,
    formAccuracy: 100,
    feedback: 'Ready to begin',
  };

  const exerciseInfo = EXERCISE_CATALOG[selectedExercise] || EXERCISE_CATALOG.squats;

  const applyPhysiquePreset = (m, f, h) => {
    setMuscleMass(m);
    setBodyFat(f);
    setHeightScale(h);
  };

  // State machine styling
  const stateBadgeClass =
    safeFsm.currentState === FSM_STATE.STATE_2_TARGET_DEPTH
      ? 'fsm-badge depth'
      : safeFsm.currentState === FSM_STATE.STATE_1_IN_MOTION
      ? 'fsm-badge motion'
      : 'fsm-badge neutral';


  return (
    <div className="ui-overlay">
      {/* Top Header Bar */}
      <header className="header-bar interactive-panel">
        <div className="brand-section">
          <div className="brand-badge">
            <Activity size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="brand-title">FITNESS AVATAR SIMULATOR</h1>
            <p className="brand-subtitle">Step 3 • Real-Time Human Pose Retargeting & FSM Motion Analysis</p>
          </div>
        </div>

        {/* Mode Switcher: Demo Mode vs Mirror Mode */}
        <div className="mode-toggle-group">
          <button
            className={`mode-btn ${trackingMode === 'demo' ? 'active' : ''}`}
            onClick={() => setTrackingMode('demo')}
            title="Loop reference workout animation on 3D Avatar"
          >
            <Play size={13} />
            Demo Mode
          </button>
          <button
            className={`mode-btn ${trackingMode === 'mirror' ? 'active' : ''}`}
            onClick={() => setTrackingMode('mirror')}
            title="Mirror your physical webcam movement on 3D Avatar in real-time"
          >
            <Video size={13} />
            Mirror Mode
          </button>
        </div>

        <div className="header-status">
          <div className="status-pill">
            <span className={`status-dot ${isTracking || trackingMode === 'mirror' ? 'live' : ''}`}></span>
            <span>
              {trackingMode === 'mirror'
                ? isTracking
                  ? 'Pose Retargeting: Connected'
                  : 'Mirror Mode: Awaiting Video'
                : 'Demo Reference Loop Active'}
            </span>
          </div>

          <div className="status-pill">
            <Zap size={14} color="#00f2fe" />
            <span>60 FPS • WebGL</span>
          </div>
        </div>
      </header>

      {/* Main HUD Body: Left & Right Columns */}
      <div className="hud-body">
        {/* ================= LEFT COLUMN ================= */}
        <aside className="sidebar-left">
          {/* FSM Repetition & Motion Tracking Card */}
          <div className="hud-card interactive-panel workout-card">
            <div className="card-title-row">
              <span className="card-title">
                <Trophy size={16} color="#39ff14" />
                FSM Motion Analyzer
              </span>
              <button
                className="hud-btn small-btn"
                onClick={onResetWorkout}
                title="Reset Rep Counter"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            {/* Exercise Selector */}
            <div className="exercise-selector-container">
              <label className="exercise-label">Exercise Pattern:</label>
              <select
                className="cyber-select"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
              >
                <option value="squats">🏋️ Bodyweight Squats</option>
                <option value="bicepCurls">💪 Bicep Curls</option>
                <option value="shoulderPress">⚡ Overhead Press</option>
                <option value="lunges">🦵 Forward Lunges</option>
                <option value="jumpingJacks">⭐ Jumping Jacks</option>
                <option value="pushups">💥 Push-Ups</option>
              </select>
            </div>

            {/* FSM State Progress Bar */}
            <div className="fsm-status-strip">
              <span className={stateBadgeClass}>
                {safeFsm.stateLabel || 'State 0: Standing'}
              </span>
            </div>

            {/* Rep Counter & Calories Stats Row */}
            <div className="rep-counter-display">
              <div className="rep-metric">
                <span className="rep-label">REPS COMPLETED</span>
                <span className="rep-number">{safeFsm.repCount}</span>
              </div>
              <div className="rep-metric">
                <span className="rep-label">ENERGY BURNED</span>
                <span className="rep-calories">
                  <Flame size={14} color="#ff5722" style={{ verticalAlign: 'middle', marginRight: '2px' }} />
                  {safeFsm.caloriesBurned} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>kcal</span>
                </span>
              </div>
            </div>

            {/* Form Accuracy Gauge Card */}
            <div className="form-feedback-card">
              <div className="form-score-row">
                <span className="form-title">
                  <Gauge size={14} color="#00f2fe" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Form Accuracy Score:
                </span>
                <span className="form-score-value">{safeFsm.formAccuracy}%</span>
              </div>

              {/* Accuracy progress bar */}
              <div className="progress-bar-bg" style={{ marginBottom: '8px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${safeFsm.formAccuracy}%`,
                    background:
                      safeFsm.formAccuracy >= 85
                        ? 'linear-gradient(90deg, #10b981, #39ff14)'
                        : 'linear-gradient(90deg, #ff9800, #ff5722)',
                  }}
                ></div>
              </div>

              <div className="feedback-message-box">
                <span>{safeFsm.feedback}</span>
              </div>
              <div className="target-muscles-tag">
                <span>Muscles: {exerciseInfo.targetMuscles}</span>
              </div>
            </div>

          </div>

          {/* Real-Time Joint Articulation Angles */}
          <div className="hud-card interactive-panel">
            <div className="card-title-row">
              <span className="card-title">
                <Compass size={16} color="#00f2fe" />
                Live Joint Telemetry
              </span>
              <span className="card-subtitle">Retargeted</span>
            </div>

            <div className="joint-angles-grid">
              <div className="joint-gauge-box">
                <div className="gauge-header">
                  <span className="gauge-label">L. Elbow</span>
                  <span className="gauge-val">{angles.leftElbow}°</span>
                </div>
                <div className="angle-bar-bg">
                  <div
                    className="angle-bar-fill"
                    style={{ width: `${(angles.leftElbow / 180) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="joint-gauge-box">
                <div className="gauge-header">
                  <span className="gauge-label">R. Elbow</span>
                  <span className="gauge-val">{angles.rightElbow}°</span>
                </div>
                <div className="angle-bar-bg">
                  <div
                    className="angle-bar-fill"
                    style={{ width: `${(angles.rightElbow / 180) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="joint-gauge-box">
                <div className="gauge-header">
                  <span className="gauge-label">L. Knee</span>
                  <span className="gauge-val">{angles.leftKnee}°</span>
                </div>
                <div className="angle-bar-bg">
                  <div
                    className="angle-bar-fill lime"
                    style={{ width: `${(angles.leftKnee / 180) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="joint-gauge-box">
                <div className="gauge-header">
                  <span className="gauge-label">R. Knee</span>
                  <span className="gauge-val">{angles.rightKnee}°</span>
                </div>
                <div className="angle-bar-bg">
                  <div
                    className="angle-bar-fill lime"
                    style={{ width: `${(angles.rightKnee / 180) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= RIGHT COLUMN ================= */}
        <aside className="sidebar-right">
          {/* Realistic Physique Tuning Card */}
          <div className="hud-card interactive-panel">
            <div className="card-title-row">
              <span className="card-title">
                <Sliders size={16} color="#00f2fe" />
                Physique Morphing
              </span>
              <button
                className="hud-btn small-btn"
                onClick={onReset}
                title="Reset to Athletic Baseline"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            {/* Quick Realistic Presets */}
            <div className="preset-buttons-row">
              <button
                className="preset-pill"
                onClick={() => applyPhysiquePreset(55, 10, 1.0)}
              >
                Athletic Lean
              </button>
              <button
                className="preset-pill active"
                onClick={() => applyPhysiquePreset(75, 14, 1.02)}
              >
                Aesthetic Fit
              </button>
              <button
                className="preset-pill"
                onClick={() => applyPhysiquePreset(95, 18, 1.05)}
              >
                Bodybuilder
              </button>
            </div>

            {/* Muscle Mass Slider */}
            <div className="control-group">
              <div className="control-label-row">
                <span className="control-label">
                  <Dumbbell size={14} color="#00f2fe" />
                  Muscle Mass & Definition
                </span>
                <span className="control-val-badge">{muscleMass}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={muscleMass}
                onChange={(e) => setMuscleMass(Number(e.target.value))}
                className="cyber-slider"
              />
              <div className="slider-hints">
                <span>Lean</span>
                <span>Athletic</span>
                <span>Hypertrophy</span>
              </div>
            </div>

            {/* Body Fat Slider */}
            <div className="control-group">
              <div className="control-label-row">
                <span className="control-label">
                  <Flame size={14} color="#ff5722" />
                  Body Fat Ratio
                </span>
                <span className="control-val-badge">{bodyFat}%</span>
              </div>
              <input
                type="range"
                min="6"
                max="32"
                value={bodyFat}
                onChange={(e) => setBodyFat(Number(e.target.value))}
                className="cyber-slider"
              />
              <div className="slider-hints">
                <span>Shredded (6%)</span>
                <span>Fit (14%)</span>
                <span>Bulk (25%+)</span>
              </div>
            </div>

            {/* Height & Frame */}
            <div className="control-group">
              <div className="control-label-row">
                <span className="control-label">
                  <Maximize2 size={14} color="#10b981" />
                  Height & Frame Scale
                </span>
                <span className="control-val-badge">{(heightScale * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.85"
                max="1.15"
                step="0.01"
                value={heightScale}
                onChange={(e) => setHeightScale(Number(e.target.value))}
                className="cyber-slider"
              />
            </div>
          </div>

          {/* Physiological Telemetry Card */}
          <div className="hud-card interactive-panel">
            <div className="card-title-row">
              <span className="card-title">
                <HeartPulse size={16} color="#00f2fe" />
                Physiological Metrics
              </span>
              <span className="card-subtitle">Telemetry</span>
            </div>

            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-label">Estimated BMI</span>
                <div className="metric-value-row">
                  <span className="metric-value">{bmi}</span>
                  <span className="metric-unit">kg/m²</span>
                </div>
              </div>

              <div className="metric-box">
                <span className="metric-label">Lean Mass</span>
                <div className="metric-value-row">
                  <span className="metric-value">{leanBodyMassKg}</span>
                  <span className="metric-unit">kg</span>
                </div>
              </div>

              <div className="metric-box">
                <span className="metric-label">Est. Weight</span>
                <div className="metric-value-row">
                  <span className="metric-value">{estimatedWeightKg}</span>
                  <span className="metric-unit">kg</span>
                </div>
              </div>

              <div className="metric-box">
                <span className="metric-label">Avatar Height</span>
                <div className="metric-value-row">
                  <span className="metric-value">{heightCm}</span>
                  <span className="metric-unit">cm</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span><Flame size={12} color="#ff5722" style={{ verticalAlign: 'middle' }} /> BMR</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>{estimatedBMR} kcal/day</span>
            </div>
          </div>
        </aside>
      </div>

      {/* OrbitControls interaction hint */}
      <div className="canvas-hint">
        <Move size={14} color="#00f2fe" />
        <span>Rotate: Left Click + Drag • Pan: Right Click • Zoom: Scroll Wheel</span>
      </div>

      {/* Bottom Floating Control Bar */}
      <footer className="bottom-bar">
        {/* Workout Poses */}
        <div className="pose-selector-panel interactive-panel">
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, marginRight: '4px' }}>
            Poses:
          </span>
          <button
            className={`hud-btn ${activePose === 'athletic' ? 'active' : ''}`}
            onClick={() => setActivePose('athletic')}
          >
            Athletic Ready
          </button>
          <button
            className={`hud-btn ${activePose === 'flex' ? 'active' : ''}`}
            onClick={() => setActivePose('flex')}
          >
            Double Bicep
          </button>
          <button
            className={`hud-btn ${activePose === 'squat' ? 'active' : ''}`}
            onClick={() => setActivePose('squat')}
          >
            Squat Stance
          </button>
          <button
            className={`hud-btn ${activePose === 'tpose' ? 'active' : ''}`}
            onClick={() => setActivePose('tpose')}
          >
            T-Pose
          </button>
        </div>

        {/* Camera Views */}
        <div className="camera-controls-panel interactive-panel">
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600, marginRight: '4px' }}>
            <Camera size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
            View:
          </span>
          <button
            className={`hud-btn ${cameraPreset === 'front' ? 'active' : ''}`}
            onClick={() => setCameraPreset('front')}
          >
            Front
          </button>
          <button
            className={`hud-btn ${cameraPreset === 'workout' ? 'active' : ''}`}
            onClick={() => setCameraPreset('workout')}
          >
            Perspective
          </button>
          <button
            className={`hud-btn ${cameraPreset === 'side' ? 'active' : ''}`}
            onClick={() => setCameraPreset('side')}
          >
            Side
          </button>
          <button
            className={`hud-btn ${cameraPreset === 'closeup' ? 'active' : ''}`}
            onClick={() => setCameraPreset('closeup')}
          >
            Torso
          </button>
        </div>
      </footer>
    </div>
  );
}
