# Shoulder press: hands at shoulder height with elbows out -> press straight overhead -> lower.

start = {
    "dirs": {
        # Upper arms out to the sides, forearms pointing up (goalpost position)
        "LeftArm": (-0.97, 0.2, -0.12),
        "LeftForeArm": (-0.05, 0.08, 1.0),
        "RightArm": (0.97, 0.2, -0.12),
        "RightForeArm": (0.05, 0.08, 1.0),
    },
}

top = {
    "dirs": {
        # Arms straight overhead, hands a little closer together
        "LeftArm": (-0.3, 0.06, 0.95),
        "LeftForeArm": (-0.12, 0.04, 0.99),
        "RightArm": (0.3, 0.06, 0.95),
        "RightForeArm": (0.12, 0.04, 0.99),
    },
}

CLIP = {
    "frames": [1, 37, 73],
    "keys": [start, top, start],
    "view": "front",
}
