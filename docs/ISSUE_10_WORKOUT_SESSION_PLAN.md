# Issue #10 — Workout screen: save the session and fix phone layout

Branch: `feature/10-workout-screen`
Spec: Phase 4 in `IMPLEMENTATION_PLAN.md`. Start after the dashboard issue (#9).

## Why

Finished workouts must reach the dashboard, and the workout screen must work
on a phone. Right now `useWorkoutSession.js` tracks every stat a session
needs, but nothing ever calls `saveSession()` from `client/src/services/sessions.js`
when a workout finishes.

## Current state (read before changing anything)

- `useWorkoutSession.js` already tracks `currentSet`, `currentReps`,
  `totalGoodReps`, `totalBadReps`, `mistakes`, `accuracy`, `overallAccuracy`,
  `averageTempo`, `elapsedSeconds`, and sets `isFinished = true` when the
  last set's reps are reached.
- `WorkoutPage.jsx`'s completion modal (shown when `session.isFinished` and
  the camera view isn't active) only displays these stats — it never saves
  them.
- The hook has no `exerciseId` field and isn't told which exercise is
  running; `WorkoutPage.jsx` already has `exercise.id` available.
- `sessions.js` is already merged and ready: `saveSession(session)` is
  `async` and expects the shape below.

```js
Session = {
  id: "1732441200000",
  date: "2026-11-24T10:20:00.000Z",
  exerciseId: "squat",
  sets: 3, reps: 45, accuracy: 82, avgTempo: 2.8, durationSeconds: 540,
  mistakes: { "Go lower": 4, "Slow down": 2 }
}
```

## Files to touch

- `client/src/hooks/useWorkoutSession.js` — accept `exerciseId`, add a
  "saved once" guard, save on finish.
- `client/src/pages/WorkoutPage.jsx` — pass `exercise.id` into the hook.
- `client/src/pages/WorkoutPage.css` — verify/fix 360px layout only (likely
  small or no changes, see below).

Do not touch `client/src/pose/`, `motionStateMachine.js`, or
`exercises.json` — Balu is working on the pose/rep-counting logic.

## Step-by-step plan

1. **Pass the exercise id into the hook**
   - In `WorkoutPage.jsx`, change `useWorkoutSession({ targetSets: 3, targetReps: 15, restDuration: 30 })` to also pass `exerciseId: exercise.id`.
   - In `useWorkoutSession.js`, accept `exerciseId` as a param (no default needed, it always comes from the page).

2. **Save exactly once per finished workout**
   - Add a `useRef(false)` flag, e.g. `hasSavedRef`, inside the hook.
   - Add a `useEffect` that runs when `isFinished` becomes `true`:
     - If `hasSavedRef.current` is already `true`, do nothing (guards against React Strict Mode's double-invoke of effects, and against re-renders after finishing).
     - Otherwise set `hasSavedRef.current = true`, build the session object, and `await saveSession(session)`.
   - Build the session object from values already in the hook:
     ```js
     {
       id: String(Date.now()),
       date: new Date().toISOString(),
       exerciseId,
       sets: targetSets,
       reps: totalGoodReps,
       accuracy: overallAccuracy,
       avgTempo: Number(averageTempo),
       durationSeconds: elapsedSeconds,
       mistakes,
     }
     ```
   - On `restartWorkout()`, reset `hasSavedRef.current = false` too, so "Do it again" can save a new session when it finishes again.

3. **Verify the full flow by hand**
   - Open a workout, use "Simulate good rep" / "Simulate bad rep" repeatedly to finish all 3 sets (45 reps total at 15/set).
   - Confirm the rest timer appears between sets with a working "Skip rest" button.
   - Confirm the completion modal shows correct reps/sets/accuracy/time.
   - Check `localStorage.fas_sessions` in dev tools — exactly one new entry should appear, matching the session shape above.
   - Click "Do It Again" and repeat — confirm a second session is saved (not a duplicate of the first, and the first "finish" effect didn't double-fire).

4. **Check phone layout at 360px**
   - `WorkoutPage.css` already collapses `.tutorial-intro-layout` and `.workout-main-grid` to one column under 900px/860px, and `.hud-counters-grid` to two columns under 480px — so this step is mostly verification, not a rebuild.
   - At 360px width, confirm: the intro/tutorial view (avatar + checkpoints) stacks cleanly, the live camera view (`CameraPanel`) and its HUD stack with nothing cut off horizontally, and the completion modal's `.summary-stats-grid` (already 2 columns) fits without overflow.
   - Check both light and dark themes at this width.
   - Fix any actual overflow or cramped spacing found — likely small CSS tweaks, not a redesign.

5. **Don't change pose/rep logic**
   - `reportRep`, `simulateGoodRep`, `simulateBadRep`, and anything in `client/src/pose/` stay as-is. This issue only adds the save-on-finish behavior and confirms layout.

## Done when

- One finished workout shows up once on the dashboard (cross-check with issue #9's dashboard page) after a real "Simulate rep" run through all 3 sets.
- A full 3-set run works end to end: reps, sets, accuracy, tempo, timer, rest timer with Skip rest, summary modal, and "Do it again".
- The page works at 360px and on a laptop, in both themes.

## Commit style

Small commits, each ending in `(#10)`. Open the PR with "Closes #10" when ready.
