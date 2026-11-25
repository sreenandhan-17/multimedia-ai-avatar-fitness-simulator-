# Crunch: lying on the back with knees bent and feet flat.
# Curl the shoulders off the floor, reaching the hands toward the knees, then lower.
#
# "body_dirs" are written as if the person were standing (see dumbbell_chest_press.py).

lying_legs = {
    "LeftUpLeg": (-0.05, 0.55, -0.83),
    "LeftLeg": (-0.02, -0.5, -0.87),
    "LeftFoot": (0.0, -0.54, -0.84),
    "LeftToeBase": (0.0, -0.05, -1.0),
    "RightUpLeg": (0.05, 0.55, -0.83),
    "RightLeg": (0.02, -0.5, -0.87),
    "RightFoot": (0.0, -0.54, -0.84),
    "RightToeBase": (0.0, -0.05, -1.0),
}

flat = {
    "body_dirs": {
        # Arms resting on the floor by the sides
        "LeftArm": (-0.18, -0.12, -0.98),
        "LeftForeArm": (-0.1, -0.05, -0.99),
        "RightArm": (0.18, -0.12, -0.98),
        "RightForeArm": (0.1, -0.05, -0.99),
    },
}

curled = {
    "body_dirs": {
        # Only the shoulder blades lift off the floor, chin stays tucked
        "Spine": (0.0, 0.12, 0.99),
        "Spine1": (0.0, 0.28, 0.96),
        "Spine2": (0.0, 0.36, 0.93),
        "Neck": (0.0, 0.45, 0.89),
        "Head": (0.0, 0.4, 0.92),
        # Hands slide toward the knees
        "LeftArm": (-0.15, 0.3, -0.94),
        "LeftForeArm": (-0.08, 0.3, -0.95),
        "RightArm": (0.15, 0.3, -0.94),
        "RightForeArm": (0.08, 0.3, -0.95),
    },
}

for bone_name in lying_legs:
    flat["body_dirs"][bone_name] = lying_legs[bone_name]
    curled["body_dirs"][bone_name] = lying_legs[bone_name]

flat["root_up"] = (0.0, 1.0, 0.0)
flat["root_facing"] = (0.0, 0.0, 1.0)
curled["root_up"] = (0.0, 1.0, 0.0)
curled["root_facing"] = (0.0, 0.0, 1.0)

CLIP = {
    "frames": [1, 37, 73],
    "keys": [flat, curled, flat],
    "view": "side",
}
