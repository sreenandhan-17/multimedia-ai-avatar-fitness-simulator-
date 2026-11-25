# Squat: stand tall -> sit hips back and down until thighs are about level -> stand.
# Directions are (right, forward, up) in the room. The character's left side is -right.
# Feet stay planted: after the first keyframe the legs are solved to reach the same ankle spots.

standing = {
    "dirs": {
        "LeftArm": (-0.12, 0.02, -0.99),
        "LeftForeArm": (-0.08, 0.06, -1.0),
        "RightArm": (0.12, 0.02, -0.99),
        "RightForeArm": (0.08, 0.06, -1.0),
    },
}

bottom = {
    # Hips move back and down
    "root_offset": (0.0, -0.16, -0.42),
    "root_up": (0.0, 0.3, 0.95),
    "dirs": {
        "Spine": (0.0, 0.42, 0.91),
        "Spine1": (0.0, 0.42, 0.91),
        "Spine2": (0.0, 0.4, 0.92),
        "Neck": (0.0, 0.2, 0.98),
        "Head": (0.0, 0.05, 1.0),
        # Arms reach forward for balance
        "LeftArm": (-0.2, 0.98, 0.0),
        "LeftForeArm": (-0.08, 1.0, 0.02),
        "RightArm": (0.2, 0.98, 0.0),
        "RightForeArm": (0.08, 1.0, 0.02),
    },
}

CLIP = {
    "frames": [1, 37, 73],
    "keys": [standing, bottom, standing],
    "pins": ["LeftFoot", "RightFoot"],
    # Knees track forward and a little outward
    "poles": {"LeftFoot": (-0.2, 1.0, 0.0), "RightFoot": (0.2, 1.0, 0.0)},
    "view": "side",
}
