# Superman: lying face down with arms stretched overhead.
# Lift the chest, arms and legs off the floor together, hold briefly, then lower.
#
# "body_dirs" are written as if the person were standing (see dumbbell_chest_press.py).
# Face down, body "forward" points at the floor and body "up" points toward the head.

flat = {
    "body_dirs": {
        # Arms overhead, resting on the floor
        "LeftArm": (-0.25, 0.08, 0.96),
        "LeftForeArm": (-0.12, 0.08, 0.99),
        "RightArm": (0.25, 0.08, 0.96),
        "RightForeArm": (0.12, 0.08, 0.99),
        # Toes pointed
        "LeftFoot": (0.0, 0.3, -0.95),
        "RightFoot": (0.0, 0.3, -0.95),
    },
}

lifted = {
    "body_dirs": {
        # Chest lifts: the spine arches backward (toward the ceiling)
        "Spine": (0.0, -0.15, 0.99),
        "Spine1": (0.0, -0.25, 0.97),
        "Spine2": (0.0, -0.3, 0.95),
        "Neck": (0.0, -0.2, 0.98),
        "Head": (0.0, -0.05, 1.0),
        # Arms lift off the floor
        "LeftArm": (-0.25, -0.35, 0.9),
        "LeftForeArm": (-0.12, -0.38, 0.92),
        "RightArm": (0.25, -0.35, 0.9),
        "RightForeArm": (0.12, -0.38, 0.92),
        # Legs lift off the floor
        "LeftUpLeg": (-0.04, -0.22, -0.97),
        "LeftLeg": (-0.03, -0.25, -0.97),
        "LeftFoot": (0.0, 0.1, -0.99),
        "RightUpLeg": (0.04, -0.22, -0.97),
        "RightLeg": (0.03, -0.25, -0.97),
        "RightFoot": (0.0, 0.1, -0.99),
    },
}

# Face down: spine points forward along the floor, chest faces the floor
flat["root_up"] = (0.0, 1.0, 0.0)
flat["root_facing"] = (0.0, 0.0, -1.0)
lifted["root_up"] = (0.0, 1.0, 0.0)
lifted["root_facing"] = (0.0, 0.0, -1.0)

CLIP = {
    # Lift, hold at the top, then lower
    "frames": [1, 31, 45, 73],
    "keys": [flat, lifted, lifted, flat],
    "view": "side",
}
