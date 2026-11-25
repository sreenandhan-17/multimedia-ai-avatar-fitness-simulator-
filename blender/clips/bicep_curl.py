# Bicep curl: arms hang straight -> curl the hands up to the shoulders -> lower slowly.
# Elbows stay pinned at the sides of the body.

down = {
    "dirs": {
        "LeftArm": (-0.1, 0.05, -0.99),
        "LeftForeArm": (-0.08, 0.1, -0.99),
        "RightArm": (0.1, 0.05, -0.99),
        "RightForeArm": (0.08, 0.1, -0.99),
    },
}

up = {
    "dirs": {
        "LeftArm": (-0.1, 0.12, -0.99),
        "LeftForeArm": (-0.05, 0.4, 0.92),
        "LeftHand": (-0.05, 0.6, 0.8),
        "RightArm": (0.1, 0.12, -0.99),
        "RightForeArm": (0.05, 0.4, 0.92),
        "RightHand": (0.05, 0.6, 0.8),
    },
}

CLIP = {
    "frames": [1, 37, 73],
    "keys": [down, up, down],
    "view": "side",
}
