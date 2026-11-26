import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 15;
const DEFAULT_REST_SECONDS = 30; // 30-second rest interval

export function useWorkoutSession({
  targetSets = DEFAULT_TARGET_SETS,
  targetReps = DEFAULT_TARGET_REPS,
  restDuration = DEFAULT_REST_SECONDS,
} = {}) {
  const [currentSet, setCurrentSet] = useState(1);
  const [currentReps, setCurrentReps] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(restDuration);
  const [isFinished, setIsFinished] = useState(false);

  const [totalGoodReps, setTotalGoodReps] = useState(0);
  const [totalBadReps, setTotalBadReps] = useState(0);
  const [mistakes, setMistakes] = useState({});
  const [totalRepDuration, setTotalRepDuration] = useState(0);

  // Dynamic accuracy tracking (Task 1 & 2)
  const [setRepScores, setSetRepScores] = useState([]);
  const [workoutRepScores, setWorkoutRepScores] = useState([]);
  const [accuracy, setAccuracy] = useState(100); // Initialized to 100% before any reps

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [feedback, setFeedback] = useState('Get into position to begin.');
  const [poseLandmarks, setPoseLandmarks] = useState(null);

  const updatePoseLandmarks = useCallback((landmarks) => {
    setPoseLandmarks(landmarks);
  }, []);

  const timerRef = useRef(null);

  // Active workout duration timer
  useEffect(() => {
    if (isFinished) return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isFinished]);

  // 30-second Rest Countdown Timer
  useEffect(() => {
    if (!isResting) return;

    const restTimer = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(restTimer);
          setIsResting(false);
          setCurrentSet((s) => {
            const nextSet = s + 1;
            setFeedback(`Set ${nextSet} started! Let’s go!`);
            return nextSet;
          });
          setCurrentReps(0);
          // Re-initialize display accuracy at 100% for the next set (Task 2)
          setSetRepScores([]);
          setAccuracy(100);
          return restDuration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(restTimer);
  }, [isResting, restDuration]);

  // Report Rep from Tracker
  const reportRep = useCallback(
    ({
      correct = true,
      duration,
      seconds = 2.5,
      mistake = null,
      repScore = 100,
      runningAccuracy = null,
    }) => {
      if (isResting || isFinished) return;

      // The generic tracker sends "duration"; dev simulate helpers send "seconds".
      const repSeconds = duration ?? seconds;
      setTotalRepDuration((prev) => prev + repSeconds);

      const score =
        typeof repScore === 'number'
          ? Math.max(40, Math.min(100, Math.round(repScore)))
          : 100;

      setSetRepScores((prev) => {
        const next = [...prev, score];
        const calculatedAvg = Math.round(
          next.reduce((a, b) => a + b, 0) / next.length
        );
        setAccuracy(runningAccuracy ?? calculatedAvg);
        return next;
      });

      setWorkoutRepScores((prev) => [...prev, score]);

      const repIsGood = correct && score >= 70;

      if (repIsGood) {
        setTotalGoodReps((g) => g + 1);
      } else {
        setTotalBadReps((b) => b + 1);
        const mistakeLabel =
          mistake || (score < 70 ? 'Form deviation' : 'Form cue');
        setMistakes((prev) => ({
          ...prev,
          [mistakeLabel]: (prev[mistakeLabel] || 0) + 1,
        }));
      }

      // Rep rule (CLAUDE.md): wrong form shows the cue but does NOT count
      // toward the set. Keep the count the same so the user redoes the rep.
      if (!repIsGood) {
        setFeedback('Form not quite right on that rep, try it again.');
        return;
      }

      setCurrentReps((prevReps) => {
        const nextReps = prevReps + 1;

        if (nextReps >= targetReps) {
          // Completed target reps (15 reps) for this set!
          if (currentSet >= targetSets) {
            // Completed all 3 sets!
            setIsFinished(true);
            setFeedback('Workout complete! Awesome performance on all 3 sets.');
          } else {
            // Set finished! Trigger 30-second rest break pop-up
            setIsResting(true);
            setRestRemaining(restDuration);
            setFeedback(`Set ${currentSet} complete! 30-second rest break.`);
          }
          return targetReps;
        }

        // Reflect current performance tier in feedback (Task 3)
        if (score >= 95) {
          setFeedback(`Rep ${nextReps}: Flawless form! Keep it up!`);
        } else if (score >= 75) {
          setFeedback(`Rep ${nextReps}: Good effort, focus on depth and keeping core tight.`);
        } else {
          setFeedback(`Rep ${nextReps}: Form slipping. Check your alignment.`);
        }
        return nextReps;
      });
    },
    [currentSet, isResting, isFinished, targetReps, targetSets, restDuration],
  );

  // Skip rest break and start next set immediately
  const skipRest = useCallback(() => {
    setIsResting(false);
    setRestRemaining(restDuration);
    setCurrentSet((s) => {
      const nextSet = s + 1;
      setFeedback(`Set ${nextSet} started! Let's go!`);
      return nextSet;
    });
    setCurrentReps(0);
    // Re-initialize display accuracy at 100% for the next set (Task 2)
    setSetRepScores([]);
    setAccuracy(100);
  }, [restDuration]);

  // Restart full workout
  const restartWorkout = useCallback(() => {
    setCurrentSet(1);
    setCurrentReps(0);
    setIsResting(false);
    setRestRemaining(restDuration);
    setIsFinished(false);
    setTotalGoodReps(0);
    setTotalBadReps(0);
    setMistakes({});
    setTotalRepDuration(0);
    setElapsedSeconds(0);
    setSetRepScores([]);
    setWorkoutRepScores([]);
    setAccuracy(100);
    setFeedback('Ready for a new session. Let’s go!');
  }, [restDuration]);

  // Dev simulation helpers
  const simulateGoodRep = useCallback(() => {
    reportRep({ correct: true, seconds: 2.8, repScore: 100 });
  }, [reportRep]);

  const simulateBadRep = useCallback(() => {
    reportRep({
      correct: false,
      seconds: 2.2,
      repScore: 60,
      mistake: 'Focus on full range of motion',
    });
  }, [reportRep]);

  const totalRepsAttempted = totalGoodReps + totalBadReps;
  const overallAccuracy =
    workoutRepScores.length > 0
      ? Math.round(
          workoutRepScores.reduce((a, b) => a + b, 0) /
            workoutRepScores.length
        )
      : accuracy;
  const averageTempo = totalRepsAttempted > 0
    ? (totalRepDuration / totalRepsAttempted).toFixed(1)
    : '0.0';

  return {
    currentSet,
    currentReps,
    targetSets,
    targetReps,
    isResting,
    restRemaining,
    restDuration,
    isFinished,
    elapsedSeconds,
    feedback,
    accuracy,
    overallAccuracy,
    averageTempo,
    totalGoodReps,
    totalBadReps,
    mistakes,
    poseLandmarks,
    updatePoseLandmarks,
    skipRest,
    restartWorkout,
    reportRep,
    simulateGoodRep,
    simulateBadRep,
  };
}
