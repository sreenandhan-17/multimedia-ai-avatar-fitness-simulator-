# Fitness Avatar Simulator

College multimedia mini-project (CUSAT, Cochin University College of Engineering Kuttanad). A web app where an avatar demonstrates an exercise and the webcam checks the user's form live with MediaPipe Pose.

Read `docs/IMPLEMENTATION_PLAN.md` for the phases. Work on one phase at a time, and say which phase we are on before starting.

## Working rules
- Work directly in this checkout. Do not use worktrees.
- Never edit `.claude/settings.json` or disable any safety or isolation guard. If a tool fails, show me the full error and ask.
- Explain a short plan before writing code for anything bigger than a small change.
- After a change, tell me how to run it and what I should see, then suggest a Git commit message.
- Do not push to GitHub or run destructive git commands (reset, force push, clean) without asking me first.
- Only one agent edits the files at a time (I run Claude Code in Antigravity's terminal).

## Hard rules
- **Zero cost, zero external AI APIs.** All pose detection, angle analysis and rep counting run in the browser. No video or image data is ever sent anywhere.
- The MediaPipe model file and WASM files are served from `client/public/`, not from a CDN.
- Do not use Firebase Storage or Cloud Functions (they need a paid plan). Serve the `.glb` avatar from `client/public/models/`.
- Never commit `.env` files, Firebase service-account keys, or API keys.

## Stack
- Client: Vite + React, react-router-dom, plain CSS with CSS variables. Later: React Three Fiber + drei, `@mediapipe/tasks-vision`.
- Server (later): Node.js + Express, `firebase-admin`.
- Firebase (later): Auth (email + Google), Firestore, Hosting.
- Avatar now: an SVG `Avatar` component ported from `prototype/fitness-avatar-prototype.html` (placeholder). Avatar later: a simple clothed human from the MPFB 2 Blender add-on, exported as one small `.glb` with named clips (`squat`, `bicep_curl`, and so on). See `docs/BLENDER_AVATAR_GUIDE.md`.

## Product decisions

**Flow:** Intro (first visit only) -> Login -> Tutorial (required first time, skippable after) -> Weekly split -> Exercise list -> Workout -> Summary. Dashboard is reachable from the top bar.

**Look:** light and dark themes with a toggle (saved in localStorage). All colours come from CSS variables. Must work at 360px wide and on a laptop. Respect `prefers-reduced-motion`. Keyboard accessible.

**Login:** fake for now (sets a logged-in flag in localStorage). Email + password, Google button, Create account tab, Forgot password button (UI only: enter email, then "Reset link sent"). Full-screen dark gym-style pattern background, large animated avatar beside the form. Real Firebase Auth comes later.

**Tutorial:** 5 steps: camera setup, follow the avatar, live feedback, rep counting, safety notice (checkbox required before Start training).

**Exercises:** a weekly split of 3 days, 2 body parts per day. All six groups work.
- Day 1: Chest and Arms. Day 2: Back and Shoulders. Day 3: Legs and Abdomen.
- Two exercises per group, defined in `client/src/exercises/exercises.json`. Adding an exercise should only need a JSON entry and its angle rules.
- Each exercise card shows the exercise name and an animated avatar of the correct posture. Nothing else (no badges, no search, no favourites).
- `liveCorrection` is true only for **squat** and **bicep curl**. Other exercises are demo only.

**Workout screen:** side by side on laptops (avatar left, camera right), stacked on phones. Feedback text box beside the camera. Counters: reps, set, live accuracy, tempo, timer. Defaults: 3 sets of 15 reps, 60 s rest with a Skip rest button. A final summary screen at the end (reps, sets, accuracy, tempo, time, mistakes with counts).

**Rep rule:** if form is wrong, show the cue, do NOT count the rep, keep the count the same, and the user redoes the rep from the same count. Tempo advice: about 3 seconds per rep, warn under 2.5 s.

**Camera:** full body in frame, mirrored view (video and drawing together, angle maths uses the unmirrored data), skeleton lines and joints overlay. If key landmarks are not clearly visible, pause counting and show "Reposition yourself. Keep your whole body in frame." Warn the user to stop if an angle is extreme.

**Safety:** disclaimer accepted in the tutorial (not medical advice, stop if pain). Angle ranges in the JSON are placeholders until a trainer confirms them.

**Dashboard:** real sessions saved in localStorage when a workout finishes. Total reps, sets and average accuracy; progression chart switchable between accuracy and reps; streak calendar; common mistakes list; next-session suggestion; range filter 7 days, 30 days, all time. Firebase replaces localStorage later.

## Code style
- Keep code simple and readable. Small files, clear names, short comments explaining why.
- Prefer regular loops and named variables over clever condensed one-liners.
- Keep React components small. Keep pose and rep logic in `client/src/pose/`, session logic in hooks, separate from UI.
- Python scripts (Blender) must be plain top-to-bottom code with regular `for` loops broken into clear steps. No list comprehensions, no one-liners, and no function wrappers unless asked.
- Keep `avatar.glb` small (a few MB), with plain materials and no face rig, so it runs smoothly on phones.
