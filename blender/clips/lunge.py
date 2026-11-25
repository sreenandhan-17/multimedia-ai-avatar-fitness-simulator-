# Lunge (split squat): left foot forward, right foot back on its toes.
# Lower straight down until the front thigh is about level and the back knee is near the floor.

top = {
    "dirs": {
        "LeftArm": (-0.12, 0.02, -0.99),
        "LeftForeArm": (-0.08, 0.06, -1.0),
        "RightArm": (0.12, 0.02, -0.99),
        "RightForeArm": (0.08, 0.06, -1.0),
        # Front leg: foot about a step ahead, foot flat
        "LeftUpLeg": (-0.02, 0.3, -0.95),
        "LeftLeg": (-0.02, 0.12, -0.99),
        "LeftFoot": (0.0, 0.84, -0.54),
        "LeftToeBase": (0.0, 1.0, 0.03),
        # Back leg: foot a step behind, heel lifted
        "RightUpLeg": (0.02, -0.32, -0.95),
        "RightLeg": (0.02, -0.36, -0.93),
        "RightFoot": (0.0, 0.45, -0.89),
        "RightToeBase": (0.0, 1.0, 0.0),
    },
}

bottom = {
    "root_offset": (0.0, 0.0, -0.36),
    "dirs": {
        "LeftArm": (-0.12, 0.02, -0.99),
        "LeftForeArm": (-0.08, 0.06, -1.0),
        "RightArm": (0.12, 0.02, -0.99),
        "RightForeArm": (0.08, 0.06, -1.0),
    },
}

CLIP = {
    "frames": [1, 37, 73],
    "keys": [top, bottom, top],
    "pins": ["LeftFoot", "RightFoot"],
    "poles": {"LeftFoot": (0.0, 1.0, 0.0), "RightFoot": (0.0, 1.0, 0.0)},
    "view": "side",
}
