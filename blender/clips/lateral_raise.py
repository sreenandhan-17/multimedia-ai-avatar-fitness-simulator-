# Lateral raise: arms by the sides -> raise them out to shoulder height -> lower slowly.
# Elbows keep a slight bend the whole time.

down = {
    "dirs": {
        "LeftArm": (-0.2, 0.12, -0.97),
        "LeftForeArm": (-0.22, 0.25, -0.94),
        "RightArm": (0.2, 0.12, -0.97),
        "RightForeArm": (0.22, 0.25, -0.94),
    },
}

up = {
    "dirs": {
        "LeftArm": (-0.98, 0.15, 0.02),
        "LeftForeArm": (-0.94, 0.3, 0.05),
        "RightArm": (0.98, 0.15, 0.02),
        "RightForeArm": (0.94, 0.3, 0.05),
    },
}

CLIP = {
    "frames": [1, 37, 73],
    "keys": [down, up, down],
    "view": "front",
}
