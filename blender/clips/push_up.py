# Push-up: high plank with straight arms -> lower the chest close to the floor -> press back up.
# The body stays one straight line that pivots around the toes; the hands stay planted.

top = {
    # Body line tilted about 22 degrees up from the floor, chest facing down
    "root_up": (0.0, 0.93, 0.37),
    "root_facing": (0.0, 0.37, -0.93),
    "dirs": {
        # Arms straight down under the shoulders, hands flat with fingers forward
        "LeftArm": (-0.08, 0.0, -1.0),
        "LeftForeArm": (-0.08, 0.0, -1.0),
        "LeftHand": (-0.05, 1.0, -0.1),
        "RightArm": (0.08, 0.0, -1.0),
        "RightForeArm": (0.08, 0.0, -1.0),
        "RightHand": (0.05, 1.0, -0.1),
    },
}

bottom = {
    # Body line about 10 degrees up from the floor: chest just above the floor
    "root_up": (0.0, 0.985, 0.17),
    "root_facing": (0.0, 0.17, -0.985),
}

CLIP = {
    "frames": [1, 37, 73],
    "keys": [top, bottom, top],
    "pins": ["LeftHand", "RightHand"],
    # Elbows bend back and a little out
    "poles": {"LeftHand": (-0.5, -0.85, 0.0), "RightHand": (0.5, -0.85, 0.0)},
    # Keep the toes fixed so the body pivots around them
    "anchor": "LeftToe_End",
    "view": "side",
}
