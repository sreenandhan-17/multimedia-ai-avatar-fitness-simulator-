# Fitness Avatar Simulator: Implementation Plan

Web app where an avatar demonstrates an exercise and the webcam checks the user's form live. Everything runs in the browser, with no paid APIs.

The plan has two parts:
- **Part A:** a 2.5-hour build (7 phases) that gives a working app for the mid-review. UI/UX comes first.
- **Part B:** work after the mid-review (Blender human avatar, Firebase, Express, testing, report).

---

## Decisions locked in
- **Flow:** Home landing page ("/") -> Login -> Tutorial -> Weekly split -> Exercise list -> Workout -> Summary. Dashboard from the top bar. The original timed intro from Phase 2 below still exists at `/intro`, but is no longer the default landing experience (issue #36).
- **Look:** light and dark themes with a toggle. Works at 360px and on a laptop.
- **Login:** email + password, Google button, Create account tab, Forgot password (UI only). Fake auth for now. Full-screen dark gym-style background with a large animated avatar beside the form.
- **Tutorial:** 5 steps, required the first time, skippable after.
- **Exercises:** weekly split of 3 days, 2 body parts per day, 2 exercises per group, all six groups working. Each card shows the correct posture as an animated avatar and nothing else.
- **Live correction:** squat and bicep curl only. Other exercises are demo only.
- **Workout:** avatar left, camera right, feedback text box beside the camera. Counters: reps, set, accuracy, tempo, timer. 3 sets of 15 reps, 60 s rest, final summary.
- **Rep rule:** bad form shows a cue, the rep is not counted, the count stays the same, redo the rep.
- **Camera:** mirrored, skeleton overlay, pause counting and show "Reposition yourself" when the body isn't visible.
- **Dashboard:** real sessions in localStorage, progression chart (accuracy or reps), streak calendar, totals, common mistakes, next-session suggestion, 7 days / 30 days / all time.
- **Avatar:** SVG placeholder first (from the prototype). Later a simple clothed human made with MPFB 2 in Blender, exported as `avatar.glb`.

---

## Setup (once per machine)

Install Node.js LTS (20+), Git, VS Code or Antigravity, Claude Code, and later Blender 4.2+.

Clone the repo, then from its root:
```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom
cd ..
```
Later phases add `@mediapipe/tasks-vision`, `three`, `@react-three/fiber`, `@react-three/drei` and `firebase`.

Keep `.env` files and Firebase keys out of Git (they are listed in `.gitignore`).

### Folder structure
```
CLAUDE.md
docs/                     plan and Blender guide
blender/                  Blender Python scripts
prototype/                first clickable prototype (single HTML file)
client/
  public/
    models/               MediaPipe .task model now, avatar.glb later
  src/
    pages/                Intro, Login, Tutorial, Split, Exercises, Workout, Dashboard
    components/           Avatar, CameraPanel, FeedbackBox, Counters, RestTimer, Chart
    data/                 exercises.json (days, groups, exercises, angle rules)
    hooks/                useWorkoutSession, useTheme
    pose/                 poseTracker, angles, smoothing, repCounter
    services/             sessions.js (localStorage now, Firebase later)
server/                   Express backend (later)
```

---

## Part A: the 2.5-hour build

| Phase | Work | Time |
|---|---|---|
| 1 | Login page | 20 min |
| 2 | Intro animation and tutorial | 15 min |
| 3 | Weekly split and exercise list | 15 min |
| 4 | Workout screen | 25 min |
| 5 | Camera, pose tracking and rep counting | 40 min |
| 6 | Dashboard | 20 min |
| 7 | Polish, test and commit | 15 min |
| | **Total** | **150 min** |

Commit after every phase, on a branch such as `phase-1-login`.

### Phase 1: Login page (20 min)
- React app with react-router-dom and plain CSS variables. Theme toggle saved in localStorage.
- Full-screen dark gym-style pattern background (light version too). Large animated `Avatar` on the left, login card on the right. On phones, a small avatar above the card.
- Card: tabs Sign in and Create account. Email, password with show/hide, validation messages (valid email, 6+ characters). Google button. Forgot password button opens an email field and then "Reset link sent to your email."
- Fake auth: a valid submit sets a logged-in flag and goes to `/tutorial`.
- `Avatar` component: port the pose functions and SVG drawing from `prototype/fitness-avatar-prototype.html`. It takes an exercise name and loops the movement.

**Done when:** you can switch tabs, see validation errors, toggle the theme, and sign in at 360px and on a laptop.

### Phase 2: Intro and tutorial (15 min)
- Intro before login on the first visit only (localStorage flag). About 6 seconds, progress bar, Skip intro, avatar squats while the app name appears.
- Tutorial with 5 steps, a progress bar, Back and Next: camera setup, follow the avatar, live feedback, rep counting, safety notice with a required checkbox.
- No Skip the first time. After the tutorial is completed once, a Skip button appears and the tutorial can be reopened from the top bar.
- Protect pages: no logged-in flag means redirect to `/login`. Sign out button in the top bar.

**Done when:** with cleared localStorage, the flow goes Intro -> Login -> Tutorial -> Split page, and the second visit skips the intro.

### Phase 3: Weekly split and exercise list (15 min)
- Weekly split page with three day cards: Day 1 Chest and Arms, Day 2 Back and Shoulders, Day 3 Legs and Abdomen, with a "Rest and recover" note.
- A day opens a list with two sections (one per body part) and two exercises each:
  - Chest: Push-up, Dumbbell chest press. Arms: Bicep curl, Overhead triceps extension.
  - Back: Bent-over row, Superman. Shoulders: Shoulder press, Lateral raise.
  - Legs: Squat, Lunge. Abdomen: Plank, Crunch.
- Each card shows the exercise name and an animated avatar of the correct posture. Nothing else.
- All of it comes from one `exercises.json`, with a `liveCorrection` flag (true only for squat and bicep curl) and a joint-angle data entry per exercise (start pose, end pose, loop time).
- Pause avatars that are off screen. If time is short, animate squat, bicep curl, push-up and shoulder press first and show still poses for the rest.

**Done when:** every card shows its own posture, and adding an exercise to the JSON adds a card with no other code change.

### Phase 4: Workout screen (25 min)
- Route `/workout/:exerciseId`. Side by side on laptops, stacked on phones.
- Left: looping `Avatar` demo with Pause/Play and 0.5x, 1x, 2x speed. Right: camera area (placeholder until Phase 5) with a Start workout button, and the feedback text box beside it. If `liveCorrection` is false, show a demo-only message.
- Counters: reps (for example 4/15), set (2/3), live accuracy, tempo (average seconds per rep), workout timer.
- `useWorkoutSession` hook: constants at the top (3 sets, 15 reps, 60 s rest). `reportRep({ correct, seconds, mistake })`. A bad rep does not increase the count.
- Rest timer between sets with Skip rest. Final summary: reps, sets, accuracy, tempo, time, mistakes with counts. Buttons: Back to exercises, Do it again.
- Dev-only buttons: Simulate good rep, Simulate bad rep.

**Done when:** a full 3-set run with the simulate buttons works, including the rest timer and the summary.

### Phase 5: Camera, pose tracking and rep counting (40 min, the hardest)
1. **Camera and skeleton:** `CameraPanel` asks for the front camera (about 640x480), loads MediaPipe `PoseLandmarker` (lite model) from `client/public/`, mirrors video and canvas together, draws skeleton lines and joints, shows FPS, and stops the camera when leaving the page. Clear message if permission is denied.
2. **Visibility check:** if key landmarks have visibility below 0.5, pause counting and show "Reposition yourself. Keep your whole body in frame."
3. **Angles:** `angles.js` (angle at a joint from three landmarks) and `smoothing.js` (average of the last 5 frames). Squat uses the knee angle (hip, knee, ankle): leaves standing under 140 degrees, back up over 150, target at the bottom 100 or less. Bicep curl uses the elbow angle (shoulder, elbow, wrist): leaves start under 140, back down over 150, target at the top 55 or less. Use the side with higher visibility. These are placeholders in `exercises.json`.
4. **Rep counting:** `repCounter.js` state machine (up, moving, back up). Good rep if the lowest angle reached the target, otherwise a bad rep with its cue text. Reports to `useWorkoutSession`. Under 2.5 s per rep shows "Slow down".
5. **Safety:** an extreme angle (for example a knee under 40 degrees) shows a stop warning.
6. **Dev panel:** current angle, state, visibility and FPS.

Camera access needs `localhost` or HTTPS. For a phone on the same Wi-Fi, add `@vitejs/plugin-basic-ssl`.

**Done when:** real squats and bicep curls are counted correctly, a shallow rep shows the cue and isn't counted, and stepping out of frame pauses counting. Target 15 FPS or more.

### Phase 6: Dashboard (20 min)
- `services/sessions.js` saves each finished workout to localStorage: id, date, exercise, sets, reps, accuracy, average tempo, duration, mistakes with counts. The summary screen calls it once.
- Summary numbers: total reps, total sets, average accuracy.
- Progression chart, switchable between accuracy per session (line) and reps per day (bars), drawn with plain SVG (no chart library).
- Streak calendar: days trained in a row, with the last weeks shown.
- Common mistakes list with counts per exercise.
- Next-session suggestion by simple rules: accuracy 85% or more suggests adding reps or a set; under 70% suggests fewer reps and focusing on the most common mistake; average tempo under 2.5 s suggests slowing down.
- Range filter: 7 days, 30 days, all time. A friendly empty state when there are no sessions, and a dev-only "Add sample sessions" button.

**Done when:** finishing a workout adds a session, the dashboard updates, and the filter and chart switch work.

### Phase 7: Polish, test and commit (15 min)
- Run the whole flow from cleared localStorage on a laptop and at 360px width.
- Check the light and dark themes on every page, keyboard use, and that no console errors remain.
- Fix the top three problems, update the README with run instructions, and commit.
- Prepare the mid-review demo path: intro, login, tutorial, split, a squat with the camera, summary, dashboard.

---

## Part B: after the mid-review

1. **Blender human avatar:** follow `docs/BLENDER_AVATAR_GUIDE.md` (MPFB 2 human, rig, hand-keyframed clips, export one `avatar.glb`). Add a React Three Fiber viewer with pause, speed and rotate, then replace the SVG placeholder.
2. **Firebase Auth:** real email and Google login, real password-reset emails, protected routes.
3. **Express and Firestore:** the server verifies the login token and saves sessions (including per-joint mistake counts and tempo). The dashboard reads from there instead of localStorage.
4. **More live correction:** lunge, push-up, then the other exercises, each from a JSON entry and its angle rules.
5. **Testing and tuning:** all team members, different lighting and distances, laptop and phone. Confirm the angle ranges with a trainer or PE teacher, and record results for the report.
6. **Deploy and submit:** Firebase Hosting, the report, UML diagrams, demo video and slides. Update the SRS: fix the "Arnica: Roots of Decay" header, the 4.3.4 numbering, and add login, the weekly split and the muscle-group catalogue.

---

## Working method (Claude Code in Antigravity)
1. Start each session with the phase, for example: "Read CLAUDE.md. We are on Phase 4." Run `/clear` between phases.
2. Ask for a short plan first, then let it build. Test and fix in the same session.
3. Commit after each working phase. Push to a branch, and merge through pull requests.
4. One agent edits the files at a time.
5. Paste exact error messages when something breaks.

## Suggested split for 5 people
| Person | Main job |
|---|---|
| A | Blender avatar and animations (Part B, starts early) |
| B | Camera, pose tracking, rep counter (Phase 5) |
| C | Screens and avatar component (Phases 1 to 4) |
| D | Dashboard, then Firebase and Express (Phase 6, Part B) |
| E | Testing, documentation, UML, report, slides |

## Risks and fallbacks
| Risk | Fallback |
|---|---|
| The 2.5 hours run out | Finish Phases 1 to 4 and show the camera skeleton from Phase 5 step 1. Do the dashboard with sample data |
| Pose accuracy is poor on some cameras | Widen the angle ranges, show the setup guide, require full body in frame |
| Phone is too slow | Use the lite model, lower the camera resolution, process fewer frames per second |
| Avatar animations take too long | Animate squat, bicep curl, push-up and shoulder press first, and show still poses for the rest |
| Blender human is too heavy or exports badly | Keep the SVG or mannequin avatar for the demo |
