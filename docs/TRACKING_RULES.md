# Tracking rules

Every exercise's live form checking is controlled entirely by a `"tracking"`
object on that exercise in `client/src/data/exercises.json`. One generic
engine (`client/src/pose/genericTracker.js`) reads these rules; it has no
code specific to any single exercise. **To add or tune an exercise, you only
ever need to edit JSON — never the tracker code.**

This doc explains every field. If you're just trying to fix a specific
problem (reps not counting, "Reposition yourself" showing too much, etc.),
jump to [Common problems](#common-problems) at the bottom.

## How a rep (or hold) gets counted

For a `"mode": "reps"` exercise, the tracker watches one joint angle and
moves through a cycle every rep:

```
IDLE -> DESCENDING -> BOTTOM_REACHED -> ASCENDING -> IDLE (rep counted)
```

(If `"direction": "raise"`, read "DESCENDING" as "moving up" and
"BOTTOM_REACHED" as "top reached" — the state names don't change, only the
direction the angle moves in.)

For a `"mode": "hold"` exercise (plank, superman), there's no cycle — the
tracker just adds up seconds while the angle stays inside the target range,
and reports a "rep" every time that running total passes `minHoldSeconds`.

## Field reference

### Always required

| Field | Type | Meaning |
|---|---|---|
| `mode` | `"reps"` \| `"hold"` | Count discrete reps, or count seconds held in position. |
| `view` | `"front"` \| `"side"` | Which camera angle this exercise is meant to be filmed from. Shown to the user as a hint; doesn't change the maths. |
| `joints` | array of exactly 3 names | The three joints whose middle one forms the angle the tracker watches, e.g. `["shoulder", "elbow", "wrist"]` measures the elbow angle. Valid names: `shoulder`, `elbow`, `wrist`, `hip`, `knee`, `ankle`. The tracker automatically uses whichever side (left/right) is more visible to the camera each frame — you never pick a side. |

### Reps-mode fields

| Field | Meaning |
|---|---|
| `startAngle` | The angle when standing/resting at the top (or bottom, if raising) of the movement. Used only as the number the rep returns to (`backAtStart`) to finish counting. |
| `descentAngle` | How far the angle must move away from `startAngle` before the tracker treats a rep as having begun. Keeps small wobbles from starting a fake rep. |
| `targetAngle` | The angle that earns **full credit** for depth/height — e.g. a squat's hip angle at full depth. |
| `targetAngleMax` | A **looser** angle that still counts the rep, but with a small accuracy penalty and a "partial depth" cue. Must sit between `descentAngle` and `targetAngle`. |
| `ascentAngle` | Once past this point on the way back, the tracker considers the person to be returning to start (this is what flips the state from BOTTOM_REACHED to ASCENDING). |
| `direction` | `"lower"` (default, don't need to set it) for exercises that start high/extended and move to a low/bent angle — squat, curl, push-up, bent-over row, crunch, overhead triceps extension. `"raise"` for exercises that start low/bent and move to a high/extended angle — shoulder press, lateral raise, dumbbell chest press. |
| `minRepSeconds` | A rep faster than this still counts, but shows "Slow down. Aim for about 3 seconds per rep." instead of the normal good-rep cue. |
| `safetyMin` / `safetyMax` | If the angle ever goes below `safetyMin` or above `safetyMax` — at any point, not just mid-rep — the tracker shows `cues.safety` and stops normal processing for that frame. Optional; only set the one(s) that matter for that joint. |

### Hold-mode fields (instead of the above)

| Field | Meaning |
|---|---|
| `targetAngle` | The **minimum** angle to count as "holding correctly" (too low below this). |
| `targetAngleMax` | The **maximum** angle still acceptable (too high above this). Optional — omit it if there's no upper limit. |
| `minHoldSeconds` | How many seconds of valid holding count as one "rep". Defaults to 1 if omitted. |

### Optional, either mode

| Field | Meaning |
|---|---|
| `postureCheck` | `{ a, b, axis, maxTiltDeg, cue }`. Checks that the line between joints `a` and `b` stays close to flat (`axis: "horizontal"`, e.g. a push-up's plank line) or close to upright (`axis: "vertical"`, e.g. a lunge's torso, or an overhead triceps extension's upper arm). If the tilt exceeds `maxTiltDeg`, the tracker pauses (shows `cue`, disables angles) instead of running the normal rep logic — use this for "you're not even in the right starting posture yet", not a mid-rep form note. |
| `extraChecks` | Array of `{ joints, min, max, cue }`. Each frame while the exercise is active, each check's own 3-joint angle must stay between `min` and `max`, or a one-time-per-rep accuracy penalty and `cue` fire (e.g. push-up's hips sagging/piking). The first entry also doubles as the "Core" angle shown on the HUD. |
| `positionChecks` | Array of `{ a, b, relation, cue }`. Checks whether joint `a` is `"above"` (default) or `"below"` joint `b` on screen — e.g. shoulder press's wrists above shoulders at the top. Same one-time-per-rep penalty as `extraChecks`. |
| `cues` | Object of message strings shown to the user — see below. |

### `cues` keys

| Key | Reps mode | Hold mode |
|---|---|---|
| `descending` | Shown while moving toward the target. | — |
| `good` | Shown on a correctly completed rep. | Shown while holding correctly. |
| `partialDepth` | Shown when `targetAngleMax` (not full `targetAngle`) is reached. | — |
| `shallow` | Shown when the person reverses before reaching any countable depth. | Fallback if `tooLow`/`tooHigh` aren't set. |
| `safety` | Shown when `safetyMin`/`safetyMax` is crossed. | Same. |
| `tooLow` | — | Shown when the angle is below `targetAngle`. |
| `tooHigh` | — | Shown when the angle is above `targetAngleMax`. |

## Full example: a reps exercise (squat)

```json
"tracking": {
  "mode": "reps",
  "view": "side",
  "joints": ["hip", "knee", "ankle"],
  "startAngle": 160,
  "descentAngle": 140,
  "targetAngle": 90,
  "targetAngleMax": 100,
  "ascentAngle": 130,
  "safetyMin": 40,
  "minRepSeconds": 2.5,
  "cues": {
    "descending": "Lowering down... reach target depth",
    "partialDepth": "Good effort, go a little lower next time.",
    "shallow": "Go lower! That squat wasn't deep enough.",
    "good": "Great squat!",
    "safety": "That knee angle looks extreme. Stand up and reset."
  }
}
```

Standing straight, the hip-knee-ankle angle is around 160°. Once it drops
below 140° (`descentAngle`), a rep starts. Reaching 90° or less
(`targetAngle`) gives full credit; reaching 100° (`targetAngleMax`) still
counts but with a small penalty and the "partial depth" cue. Rising back
past 130° (`ascentAngle`) starts the return trip, and the rep is counted
once the angle is back at 160° or above (`startAngle`). If the angle ever
drops below 40° (`safetyMin`), the tracker shows the safety cue instead.

## Full example: a hold exercise (plank)

```json
"tracking": {
  "mode": "hold",
  "view": "side",
  "joints": ["shoulder", "hip", "ankle"],
  "targetAngle": 165,
  "targetAngleMax": 180,
  "minHoldSeconds": 1,
  "cues": {
    "good": "Great plank, keep holding!",
    "tooLow": "Lift your hips! Don't let them sag.",
    "tooHigh": "Lower your hips! Don't pike up."
  }
}
```

The shoulder-hip-ankle line should stay close to straight. Below 165°
(`targetAngle`), the hips have sagged — `tooLow` cue, timer doesn't add up.
Above 180° (`targetAngleMax`) means piking up — `tooHigh` cue. In between,
every second counts toward `holdSeconds`, and every full `minHoldSeconds`
(here, every 1 second) reports one "rep" to the HUD.

## How to tune an exercise (5 steps)

1. **Do the movement yourself in front of the camera** with the dev panel
   open, and read the live angle number as you move through the full range
   of motion.
2. **Note the angle at full extension/standing** (this is your
   `startAngle`) **and at full depth/contraction** (this is your
   `targetAngle`).
3. **Set `descentAngle`** a little way off `startAngle` (10-20°) so a small
   wobble doesn't start a fake rep, and **set `ascentAngle`** a little way
   off `targetAngle` in the same direction, so the return trip only starts
   once you've genuinely begun to reverse.
4. **Set `targetAngleMax`** a bit short of `targetAngle` (same side as
   `descentAngle`/`ascentAngle`) — this is how far short of full depth you'll
   still accept a (penalized) rep.
5. **Do a few real reps and a few bad ones** (too shallow, too slow, step out
   of frame) and confirm each shows the cue you expect. Re-adjust one number
   at a time — don't change two fields and guess which one fixed it.

## Common problems

| Symptom | Likely cause | What to change |
|---|---|---|
| Good reps aren't counted | `targetAngle` (or `targetAngleMax`) is set tighter than the angle you actually reach | Loosen `targetAngle`/`targetAngleMax` toward the angle you measured in step 2 above |
| Reps count too easily (barely any movement counts) | `descentAngle` is too close to `startAngle`, or `targetAngleMax` is too close to `startAngle` | Move `descentAngle` further from `startAngle`; tighten `targetAngleMax` toward `targetAngle` |
| "Reposition yourself" shows too often | Camera framing issue, or `postureCheck.maxTiltDeg` is too strict for the joints chosen | Check the person is fully in frame first; if posture is genuinely fine but still flagged, raise `maxTiltDeg` a few degrees |
| "Slow down" shows too strictly | `minRepSeconds` is set higher than a normal-paced rep actually takes | Lower `minRepSeconds` slightly (the default used across most exercises is `2.5`) |

## Adding a brand-new exercise

Add an exercise entry to `exercises.json` with a `"tracking"` object built
from the fields above, and set `"liveCorrection": true`. No other file
needs to change — `exerciseTracker.js` picks up any exercise with a
`tracking` rule automatically.
