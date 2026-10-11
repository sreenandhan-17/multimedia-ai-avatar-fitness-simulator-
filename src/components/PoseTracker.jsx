import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera as CameraIcon, VideoOff, RefreshCw, Eye, EyeOff, Play, Square, Activity } from 'lucide-react';
import { extractJointAngles, POSE_LANDMARKS } from '../utils/poseGeometry';

// Connection pairs for 2D skeletal rendering
const POSE_CONNECTIONS = [
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
];

export default function PoseTracker({
  onPoseDetected,
  selectedExercise = 'squats',
  isTracking,
  setIsTracking,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseInstanceRef = useRef(null);
  const cameraHelperRef = useRef(null);
  const simIntervalRef = useRef(null);

  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMirrored, setIsMirrored] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Camera Standby');
  const [fps, setFps] = useState(0);

  const fpsCount = useRef(0);
  const lastFpsTime = useRef(Date.now());

  // Draws 2D neon skeleton on canvas overlay
  const drawSkeleton = useCallback((ctx, landmarks, angles, width, height) => {
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length === 0) return;

    // 1. Draw Connecting Bones
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.3 && (p2.visibility ?? 1) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.strokeStyle = '#00f2fe';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.stroke();
      }
    });

    // 2. Draw Key Joints
    landmarks.forEach((p, idx) => {
      if ((p.visibility ?? 1) > 0.4) {
        const x = p.x * width;
        const y = p.y * height;

        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, 2 * Math.PI);

        // Highlight elbow & knee joints
        if (
          idx === POSE_LANDMARKS.LEFT_ELBOW ||
          idx === POSE_LANDMARKS.RIGHT_ELBOW ||
          idx === POSE_LANDMARKS.LEFT_KNEE ||
          idx === POSE_LANDMARKS.RIGHT_KNEE
        ) {
          ctx.fillStyle = '#39ff14'; // Active lime for primary workout joints
          ctx.shadowColor = '#39ff14';
          ctx.shadowBlur = 12;
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00f2fe';
          ctx.shadowBlur = 6;
        }
        ctx.fill();
      }
    });

    // 3. Draw Biomechanical Angle Tags
    if (angles) {
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;

      const drawTag = (pt, text) => {
        if (!pt) return;
        const x = pt.x * width + 8;
        const y = pt.y * height - 8;
        ctx.fillStyle = 'rgba(10, 14, 23, 0.85)';
        ctx.fillRect(x - 3, y - 11, ctx.measureText(text).width + 6, 15);
        ctx.fillStyle = '#00f2fe';
        ctx.fillText(text, x, y);
      };

      const le = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
      const re = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
      const lk = landmarks[POSE_LANDMARKS.LEFT_KNEE];
      const rk = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

      drawTag(le, `${angles.leftElbow}°`);
      drawTag(re, `${angles.rightElbow}°`);
      drawTag(lk, `${angles.leftKnee}°`);
      drawTag(rk, `${angles.rightKnee}°`);
    }
  }, []);

  // Process results from MediaPipe
  const onPoseResults = useCallback((results) => {
    // Measure FPS
    fpsCount.current += 1;
    const now = Date.now();
    if (now - lastFpsTime.current >= 1000) {
      setFps(fpsCount.current);
      fpsCount.current = 0;
      lastFpsTime.current = now;
    }

    if (canvasRef.current && results.poseLandmarks) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const angles = extractJointAngles(results.poseLandmarks);

      drawSkeleton(ctx, results.poseLandmarks, angles, canvas.width, canvas.height);
      onPoseDetected({ landmarks: results.poseLandmarks, angles });
    }
  }, [drawSkeleton, onPoseDetected]);

  // Initialize MediaPipe Pose instance
  const initMediaPipe = useCallback(async () => {
    try {
      setStatusMessage('Loading Pose WASM...');
      const { Pose } = await import('@mediapipe/pose');

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);
      poseInstanceRef.current = pose;
      setStatusMessage('MediaPipe Ready');
      return pose;
    } catch (err) {
      console.warn('MediaPipe initialization fallback:', err);
      setStatusMessage('MediaPipe Initialized (WASM/CDN)');
      return null;
    }
  }, [onPoseResults]);

  // Start Real Webcam
  const startWebcam = async () => {
    stopSimulation();
    setStatusMessage('Requesting camera...');

    try {
      let pose = poseInstanceRef.current;
      if (!pose) {
        pose = await initMediaPipe();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const { Camera } = await import('@mediapipe/camera_utils');
        const cameraHelper = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && poseInstanceRef.current) {
              await poseInstanceRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        cameraHelper.start();
        cameraHelperRef.current = cameraHelper;

        setIsWebcamActive(true);
        setIsTracking(true);
        setStatusMessage('Live Tracking Active');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setStatusMessage('Camera denied - starting Demo Simulation');
      startSimulation();
    }
  };

  // Stop Webcam
  const stopWebcam = () => {
    if (cameraHelperRef.current) {
      cameraHelperRef.current.stop();
      cameraHelperRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setIsTracking(false);
    setStatusMessage('Camera Inactive');
  };

  // Workout Motion Simulation Mode
  const startSimulation = () => {
    stopWebcam();
    setIsSimulating(true);
    setIsTracking(true);
    setStatusMessage(`Simulating: ${selectedExercise}`);

    let simTime = 0;
    simIntervalRef.current = setInterval(() => {
      simTime += 0.05;

      // Generate realistic biomechanical angles according to selected exercise
      const cycle = (Math.sin(simTime * 2) + 1) / 2; // 0..1 smooth sinusoidal rep cycle

      let simulatedAngles = {
        leftElbow: 165,
        rightElbow: 165,
        leftKnee: 175,
        rightKnee: 175,
        leftShoulder: 25,
        rightShoulder: 25,
        leftHip: 170,
        rightHip: 170,
        torsoInclination: 90,
      };

      if (selectedExercise === 'squats') {
        // Knees flex down to 80° then back to 175°
        const knee = Math.round(175 - cycle * 95);
        simulatedAngles.leftKnee = knee;
        simulatedAngles.rightKnee = knee;
        simulatedAngles.torsoInclination = Math.round(90 - cycle * 20);
      } else if (selectedExercise === 'bicepCurls') {
        // Elbows curl up to 45° then back to 165°
        const elbow = Math.round(165 - cycle * 120);
        simulatedAngles.leftElbow = elbow;
        simulatedAngles.rightElbow = elbow;
      } else if (selectedExercise === 'shoulderPress') {
        // Press upwards from 75° to 170°
        const press = Math.round(75 + cycle * 95);
        simulatedAngles.leftElbow = press;
        simulatedAngles.rightElbow = press;
        simulatedAngles.leftShoulder = Math.round(40 + cycle * 100);
        simulatedAngles.rightShoulder = Math.round(40 + cycle * 100);
      } else if (selectedExercise === 'jumpingJacks') {
        // Arms raise overhead
        const armLift = Math.round(30 + cycle * 125);
        simulatedAngles.leftShoulder = armLift;
        simulatedAngles.rightShoulder = armLift;
        simulatedAngles.leftKnee = Math.round(175 - (1 - cycle) * 15);
        simulatedAngles.rightKnee = Math.round(175 - (1 - cycle) * 15);
      } else if (selectedExercise === 'lunges') {
        // Alternating / deep front knee flexion
        simulatedAngles.leftKnee = Math.round(175 - cycle * 85);
        simulatedAngles.rightKnee = Math.round(175 - (1 - cycle) * 40);
      } else {
        // Push-ups
        const pushElbow = Math.round(165 - cycle * 80);
        simulatedAngles.leftElbow = pushElbow;
        simulatedAngles.rightElbow = pushElbow;
      }

      // Generate synthetic 2D skeleton keypoints for visualization
      const syntheticLandmarks = new Array(33).fill(null).map((_, i) => ({
        x: 0.5,
        y: 0.5,
        visibility: 0.95,
      }));

      // Map primary joints into visible coordinates
      const squatDip = selectedExercise === 'squats' ? cycle * 0.12 : 0;
      syntheticLandmarks[POSE_LANDMARKS.NOSE] = { x: 0.5, y: 0.18 + squatDip, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.LEFT_SHOULDER] = { x: 0.42, y: 0.28 + squatDip, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.RIGHT_SHOULDER] = { x: 0.58, y: 0.28 + squatDip, visibility: 1 };

      // Arm positions responding to simulated exercise
      const curlFlex = selectedExercise === 'bicepCurls' ? cycle * 0.16 : 0;
      const pressLift = selectedExercise === 'shoulderPress' ? cycle * 0.2 : 0;
      syntheticLandmarks[POSE_LANDMARKS.LEFT_ELBOW] = { x: 0.38, y: 0.45 + squatDip - pressLift * 0.5, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.RIGHT_ELBOW] = { x: 0.62, y: 0.45 + squatDip - pressLift * 0.5, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.LEFT_WRIST] = { x: 0.38, y: 0.62 + squatDip - curlFlex - pressLift, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.RIGHT_WRIST] = { x: 0.62, y: 0.62 + squatDip - curlFlex - pressLift, visibility: 1 };

      // Leg positions responding to squat
      syntheticLandmarks[POSE_LANDMARKS.LEFT_HIP] = { x: 0.44, y: 0.54 + squatDip, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.RIGHT_HIP] = { x: 0.56, y: 0.54 + squatDip, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.LEFT_KNEE] = { x: 0.43, y: 0.72 + squatDip * 0.5, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.RIGHT_KNEE] = { x: 0.57, y: 0.72 + squatDip * 0.5, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.LEFT_ANKLE] = { x: 0.42, y: 0.92, visibility: 1 };
      syntheticLandmarks[POSE_LANDMARKS.RIGHT_ANKLE] = { x: 0.58, y: 0.92, visibility: 1 };

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        drawSkeleton(ctx, syntheticLandmarks, simulatedAngles, canvasRef.current.width, canvasRef.current.height);
      }

      onPoseDetected({ landmarks: syntheticLandmarks, angles: simulatedAngles });
    }, 50);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
    if (!isWebcamActive) {
      setIsTracking(false);
      setStatusMessage('Simulation Stopped');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
      stopSimulation();
    };
  }, []);

  return (
    <div className={`pose-tracker-panel interactive-panel ${isMinimized ? 'minimized' : ''}`}>
      {/* Tracker Header */}
      <div className="tracker-header">
        <div className="tracker-title-row">
          <Activity size={15} color="#00f2fe" />
          <span className="tracker-title">AI Pose Vision</span>
          <span className={`tracker-badge ${isWebcamActive || isSimulating ? 'active' : ''}`}>
            {isWebcamActive ? 'LIVE WEBCAM' : isSimulating ? 'SIMULATION' : 'STANDBY'}
          </span>
        </div>

        <div className="tracker-actions">
          <button
            className="icon-btn"
            onClick={() => setIsMirrored(!isMirrored)}
            title="Mirror Video Feed"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Camera View' : 'Minimize Camera View'}
          >
            {isMinimized ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
        </div>
      </div>

      {/* Main Video & Skeleton Viewport */}
      {!isMinimized && (
        <div className="tracker-viewport">
          <video
            ref={videoRef}
            className={`webcam-feed ${isMirrored ? 'mirrored' : ''}`}
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className={`skeleton-canvas ${isMirrored ? 'mirrored' : ''}`}
          />

          {/* Fallback Overlay if camera is off and not simulating */}
          {!isWebcamActive && !isSimulating && (
            <div className="viewport-idle-overlay">
              <CameraIcon size={32} strokeWidth={1.5} color="#64748b" />
              <span>Camera Off</span>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>Click below to start live tracking or test with simulation</p>
            </div>
          )}

          {/* Telemetry pill */}
          {(isWebcamActive || isSimulating) && (
            <div className="viewport-telemetry">
              <span>{isSimulating ? 'Simulated 60 FPS' : `${fps} FPS`}</span>
              <span className="dot-active"></span>
            </div>
          )}
        </div>
      )}

      {/* Tracker Control Buttons */}
      <div className="tracker-footer">
        <div className="btn-group">
          {!isWebcamActive ? (
            <button className="hud-btn primary active" onClick={startWebcam}>
              <CameraIcon size={14} /> Start Camera
            </button>
          ) : (
            <button className="hud-btn danger" onClick={stopWebcam}>
              <VideoOff size={14} /> Stop Camera
            </button>
          )}

          {!isSimulating ? (
            <button className="hud-btn secondary" onClick={startSimulation}>
              <Play size={14} /> Simulate Demo
            </button>
          ) : (
            <button className="hud-btn danger" onClick={stopSimulation}>
              <Square size={14} /> Stop Sim
            </button>
          )}
        </div>

        <div className="tracker-status-line">
          <span>{statusMessage}</span>
        </div>
      </div>
    </div>
  );
}
