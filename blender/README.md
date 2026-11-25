# Building the 3D avatar

`build_avatar.py` makes `client/public/models/avatar.glb`: the female (Ch22) and male (Ch31)
Mixamo characters, with one looping animation clip per exercise.

## What you need

- Blender 5.2 (`blender.cmd` in the repo root points to it)
- Node.js (the script compresses the file with `npx @gltf-transform/cli`)
- `Ch22_nonPBR.fbx` and `Ch31_nonPBR.fbx` from Mixamo, in your Downloads folder,
  or in the folder named by the `FAS_CHARACTER_DIR` environment variable

## Build

From the repo root:

```
blender.cmd --background --python blender/build_avatar.py
```

The result is about 3 MB. Commit `client/public/models/avatar.glb` together with any clip changes.

## Preview without exporting

Renders every keyframe to PNG files (the script prints the folder):

```
blender.cmd --background --python blender/build_avatar.py -- --preview --only squat,lunge
```

Each keyframe gives two pictures: `_view` from the exercise's camera side, and `_flat` from
straight side-on, which is the easiest way to check the feet and body touch the floor.

## How a clip file works

Each file in `clips/` describes one exercise as a few keyframes. A keyframe says which way
each body part points, as `(right, forward, up)` for a character facing forward:

- `dirs`: directions in the room. `"LeftArm": (-0.1, 0.0, -1.0)` means the left upper arm
  points almost straight down. The character's left side is negative "right".
- `body_dirs`: directions relative to the hips, written as if the person were standing.
  Use these for lying exercises.
- `root_up` / `root_facing`: which way the spine and the chest point. Lying on the back is
  `root_up (0, 1, 0)`, `root_facing (0, 0, 1)`.
- `root_offset`: how far the hips move from keyframe 1, in metres.
- `pins`: hands or feet that stay where they were in keyframe 1 (the knees or elbows bend
  toward `poles` to reach them).
- `anchor`: a bone that stays fixed while the body turns around it (the toes in a push-up).
- `frames`: 24 fps, so frames 1 to 73 are one 3-second rep. Make the last keyframe the same
  as the first so the loop is seamless.

Keyframe 1 is always set on the floor automatically.

## Adding an exercise

1. Copy a similar file in `clips/`, rename it to the new clip name and change the poses.
2. Add the name to `clip_order` in `build_avatar.py`.
3. Preview it, then build.
4. In `exercises.json`, set `"avatarClip"` to the clip name and `"avatarView"` to `front` or `side`.
