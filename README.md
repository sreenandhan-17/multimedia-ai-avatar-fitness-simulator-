# Fitness Avatar Simulator

College multimedia mini-project (CUSAT, Cochin University College of Engineering Kuttanad).
A web app where an avatar demonstrates an exercise and the webcam checks the user's form
live, using MediaPipe Pose. Everything runs in the browser — no video or image data is ever
sent anywhere, and there are no paid APIs.

## Quick start

```bash
git clone https://github.com/sreenandhan-17/multimedia-ai-avatar-fitness-simulator-.git
cd multimedia-ai-avatar-fitness-simulator-/client
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`). Camera access needs
`localhost` or HTTPS.

## What it does

- **Flow:** Home landing page ("/") → Login → Tutorial → Weekly split → Exercise list →
  Workout → Summary. Dashboard is reachable from the top bar. The original timed intro
  still exists at `/intro`, but is no longer the default landing experience.
- **Weekly split:** 3 days, 2 body parts per day, 2 exercises per group — 12 exercises total.
- **Live correction:** all 12 exercises are checked live against the webcam (pose
  landmarks, joint angles, rep counting, driven by a per-exercise rule in
  `exercises.json` — see `docs/TRACKING_RULES.md`).
- **Themes:** light and dark, toggle saved in the browser.

## Project structure

```
CLAUDE.md                 working rules and product decisions for this project
docs/
  IMPLEMENTATION_PLAN.md   the phased build plan
blender/                  Blender Python scripts for the 3D avatar animations
client/
  public/
    models/                MediaPipe model file and the avatar .glb files
    wasm/                  MediaPipe WASM runtime
  src/
    pages/                 Intro, Login, Tutorial, Split, Exercise list, Workout
    components/            Avatar, CameraPanel, TopBar, forms, etc.
    data/                  exercises.json (days, groups, exercises, angle rules)
    hooks/                 useWorkoutSession, useTheme
    pose/                  pose tracking, angle math, rep counting
    services/              session storage (sessions.js)
legacy/                    the earlier Three.js prototype, kept for reference
```

## Current status

The app is rebuilt per `docs/IMPLEMENTATION_PLAN.md` through Phase 5 (login, intro, tutorial,
weekly split, exercise list, workout screen, camera and pose tracking for squat and bicep
curl). The dashboard (Phase 6) and the remaining exercise animations are in progress — see
the repo's [open issues](https://github.com/sreenandhan-17/multimedia-ai-avatar-fitness-simulator-/issues)
for exactly what's being worked on and by whom.

## Contributing (team workflow)

- `main` is protected: all changes go through a pull request with at least one approval.
- Pick up an issue, then branch from `main`: `git checkout main && git pull && git checkout -b feature/<issue-number>-<short-name>`.
- Each issue lists what files you may change and its "Done when" checklist.
- Open a PR with `Closes #<issue-number>` in the description. A GitHub Action
  (`.github/workflows/claude-code-review.yml`) automatically reviews every PR against its
  linked issue and posts feedback as comments — it never approves or merges.
- A maintainer reviews and merges.

## Hard rules (see `CLAUDE.md` for the full list)

- Zero cost, zero external AI APIs — all pose detection and rep counting run in the browser.
- The MediaPipe model and WASM files are served from `client/public/`, not a CDN.
- Avatar `.glb` files are kept small (a few MB) so they run smoothly on phones.
- No `.env` files, Firebase keys, or other secrets are ever committed.
