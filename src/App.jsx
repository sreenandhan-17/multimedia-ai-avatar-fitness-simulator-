import React, { useState, useRef, useCallback } from 'react';
import AvatarCanvas from './components/AvatarCanvas';
import FitnessHUD from './components/FitnessHUD';
import PoseTracker from './components/PoseTracker';
import { MotionStateMachine } from './utils/motionStateMachine';

export default function App() {
  // Realistic Human Avatar Morphology
  const [muscleMass, setMuscleMass] = useState(72);
  const [bodyFat, setBodyFat] = useState(13);
  const [heightScale, setHeightScale] = useState(1.0);
  const [activePose, setActivePose] = useState('athletic');
  const [cameraPreset, setCameraPreset] = useState('front');
  const [modelStatus, setModelStatus] = useState('Realistic Human Skeletal Rig');

  // Step 3: Tracking Mode ('demo' vs 'mirror')
  const [trackingMode, setTrackingMode] = useState('demo');

  // Step 3: Pose Landmarks & Biomechanics
  const [landmarks, setLandmarks] = useState(null);
  const [liveAngles, setLiveAngles] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('squats');

  // Motion State Machine (FSM)
  const motionFSMRef = useRef(new MotionStateMachine('squats'));
  const [fsmState, setFsmState] = useState(() => motionFSMRef.current.getState());

  // Handle pose detected from MediaPipe or Simulation
  const handlePoseDetected = useCallback(({ landmarks: rawLandmarks, angles }) => {
    setLandmarks(rawLandmarks);
    setLiveAngles(angles);

    if (motionFSMRef.current) {
      const state = motionFSMRef.current.update(angles);
      setFsmState({ ...state });
    }
  }, []);

  // Exercise change handler
  const handleExerciseChange = (newExercise) => {
    setSelectedExercise(newExercise);
    if (motionFSMRef.current) {
      motionFSMRef.current.setExercise(newExercise);
      setFsmState(motionFSMRef.current.getState());
    }
  };

  // Reset FSM workout reps & accuracy
  const handleResetWorkout = () => {
    if (motionFSMRef.current) {
      motionFSMRef.current.reset();
      setFsmState(motionFSMRef.current.getState());
    }
  };

  // Reset physique morphology
  const handleResetPhysique = () => {
    setMuscleMass(72);
    setBodyFat(13);
    setHeightScale(1.0);
    setActivePose('athletic');
    setCameraPreset('front');
  };

  return (
    <div className="app-container">
      {/* 3D R3F Avatar Canvas Viewport */}
      <AvatarCanvas
        muscleMass={muscleMass}
        bodyFat={bodyFat}
        heightScale={heightScale}
        activePose={activePose}
        cameraPreset={cameraPreset}
        landmarks={landmarks}
        liveAngles={liveAngles}
        trackingMode={trackingMode}
        selectedExercise={selectedExercise}
        onModelStatusChange={setModelStatus}
      />

      {/* Cyber-Fitness Interactive HUD Overlay */}
      <FitnessHUD
        muscleMass={muscleMass}
        setMuscleMass={setMuscleMass}
        bodyFat={bodyFat}
        setBodyFat={setBodyFat}
        heightScale={heightScale}
        setHeightScale={setHeightScale}
        activePose={activePose}
        setActivePose={setActivePose}
        cameraPreset={cameraPreset}
        setCameraPreset={setCameraPreset}
        modelStatus={modelStatus}
        onReset={handleResetPhysique}
        // Step 3 Props
        trackingMode={trackingMode}
        setTrackingMode={setTrackingMode}
        fsmState={fsmState}
        liveAngles={liveAngles}
        selectedExercise={selectedExercise}
        setSelectedExercise={handleExerciseChange}
        onResetWorkout={handleResetWorkout}
        isTracking={isTracking}
      />

      {/* Client-Side AI Pose Vision Tracker */}
      <PoseTracker
        onPoseDetected={handlePoseDetected}
        selectedExercise={selectedExercise}
        isTracking={isTracking}
        setIsTracking={setIsTracking}
      />
    </div>
  );
}
