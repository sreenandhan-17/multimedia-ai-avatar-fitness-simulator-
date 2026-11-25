# Overhead triceps extension: upper arms stay vertical next to the head while the forearms
# lower behind the head and then straighten back up.

top = {
    "dirs": {
        "LeftArm": (-0.15, 0.06, 0.99),
        "LeftForeArm": (-0.05, 0.05, 1.0),
        "RightArm": (0.15, 0.06, 0.99),
        "RightForeArm": (0.05, 0.05, 1.0),
    },
}

bottom = {
    "dirs": {
        "LeftArm": (-0.15, 0.1, 0.98),
        # Forearms fold down behind the head, hands close together
        "LeftForeArm": (0.12, -0.35, -0.93),
        "RightArm": (0.15, 0.1, 0.98),
        "RightForeArm": (-0.12, -0.35, -0.93),
    },
}

CLIP = {
    "frames": [1, 37, 73],
    "keys": [top, bottom, top],
    "view": "side",
}
