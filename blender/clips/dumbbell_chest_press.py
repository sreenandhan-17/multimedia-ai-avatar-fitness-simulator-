# Dumbbell chest press (floor press): lying on the back with knees bent.
# Elbows rest on the floor out to the sides, then the arms press straight up to the ceiling.
#
# "body_dirs" are written as if the person were standing: (right, forward, up) of the body.
# Lying on the back, body "forward" points at the ceiling and body "up" points toward the head.

lying_legs = {
    # Knees up toward the ceiling, feet flat on the floor
    "LeftUpLeg": (-0.05, 0.55, -0.83),
    "LeftLeg": (-0.02, -0.5, -0.87),
    "LeftFoot": (0.0, -0.54, -0.84),
    "LeftToeBase": (0.0, -0.05, -1.0),
    "RightUpLeg": (0.05, 0.55, -0.83),
    "RightLeg": (0.02, -0.5, -0.87),
    "RightFoot": (0.0, -0.54, -0.84),
    "RightToeBase": (0.0, -0.05, -1.0),
}

bottom = {
    "body_dirs": {
        # Elbows out on the floor, forearms pointing at the ceiling
        "LeftArm": (-0.8, -0.15, -0.55),
        "LeftForeArm": (-0.05, 1.0, 0.05),
        "RightArm": (0.8, -0.15, -0.55),
        "RightForeArm": (0.05, 1.0, 0.05),
    },
}

top = {
    "body_dirs": {
        # Arms straight up over the chest
        "LeftArm": (-0.15, 0.99, 0.0),
        "LeftForeArm": (-0.05, 1.0, 0.0),
        "RightArm": (0.15, 0.99, 0.0),
        "RightForeArm": (0.05, 1.0, 0.0),
    },
}

for bone_name in lying_legs:
    bottom["body_dirs"][bone_name] = lying_legs[bone_name]
    top["body_dirs"][bone_name] = lying_legs[bone_name]

# Lying on the back: spine points forward along the floor, chest faces the ceiling
bottom["root_up"] = (0.0, 1.0, 0.0)
bottom["root_facing"] = (0.0, 0.0, 1.0)
top["root_up"] = (0.0, 1.0, 0.0)
top["root_facing"] = (0.0, 0.0, 1.0)

CLIP = {
    "frames": [1, 37, 73],
    "keys": [bottom, top, bottom],
    "view": "side",
}
