# Plank (forearm plank): a hold, not a rep.
# Elbows under the shoulders, forearms flat, body in one straight line on the toes.
# The loop is a slow, small breathing movement so the avatar does not look frozen.

hold = {
    # Body line about 12 degrees up from the floor, chest facing down
    "root_up": (0.0, 0.98, 0.2),
    "root_facing": (0.0, 0.2, -0.98),
    "dirs": {
        # Upper arms straight down, forearms flat on the floor, hands a little inward
        "LeftArm": (0.0, 0.03, -1.0),
        "LeftForeArm": (0.15, 0.99, -0.03),
        "LeftHand": (0.1, 1.0, -0.05),
        "RightArm": (0.0, 0.03, -1.0),
        "RightForeArm": (-0.15, 0.99, -0.03),
        "RightHand": (-0.1, 1.0, -0.05),
        "Head": (0.0, 0.9, 0.0),
    },
}

breathe_in = {
    # Back rises about 1 cm
    "root_offset": (0.0, 0.0, 0.012),
    "root_up": hold["root_up"],
    "root_facing": hold["root_facing"],
    "dirs": {},
}
for bone_name in hold["dirs"]:
    breathe_in["dirs"][bone_name] = hold["dirs"][bone_name]

CLIP = {
    # 4-second breathing cycle
    "frames": [1, 49, 97],
    "keys": [hold, breathe_in, hold],
    "view": "side",
}
