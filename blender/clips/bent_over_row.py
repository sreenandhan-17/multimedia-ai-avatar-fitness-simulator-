# Bent-over row: hinge at the hips with a flat back and soft knees.
# Arms hang straight down, then pull the elbows back past the body, then lower.

hinge = {
    # Pelvis tilts forward with the torso
    "root_up": (0.0, 0.7, 0.71),
    "dirs": {
        "Spine": (0.0, 0.82, 0.57),
        "Spine1": (0.0, 0.82, 0.57),
        "Spine2": (0.0, 0.82, 0.57),
        "Neck": (0.0, 0.88, 0.47),
        "Head": (0.0, 0.9, 0.43),
        # Soft knees, feet flat
        "LeftUpLeg": (-0.02, 0.18, -0.98),
        "LeftLeg": (-0.02, -0.1, -0.99),
        "LeftFoot": (0.0, 0.84, -0.54),
        "LeftToeBase": (0.0, 1.0, 0.03),
        "RightUpLeg": (0.02, 0.18, -0.98),
        "RightLeg": (0.02, -0.1, -0.99),
        "RightFoot": (0.0, 0.84, -0.54),
        "RightToeBase": (0.0, 1.0, 0.03),
    },
}

hang = {
    "LeftArm": (-0.05, 0.05, -1.0),
    "LeftForeArm": (-0.03, 0.05, -1.0),
    "RightArm": (0.05, 0.05, -1.0),
    "RightForeArm": (0.03, 0.05, -1.0),
}

pull = {
    # Elbows pulled back to about shoulder height, forearms still hanging
    "LeftArm": (-0.18, -0.97, 0.12),
    "LeftForeArm": (-0.03, 0.08, -1.0),
    "RightArm": (0.18, -0.97, 0.12),
    "RightForeArm": (0.03, 0.08, -1.0),
}

arms_down = {"root_up": hinge["root_up"], "dirs": {}}
arms_up = {"root_up": hinge["root_up"], "dirs": {}}
for bone_name in hinge["dirs"]:
    arms_down["dirs"][bone_name] = hinge["dirs"][bone_name]
    arms_up["dirs"][bone_name] = hinge["dirs"][bone_name]
for bone_name in hang:
    arms_down["dirs"][bone_name] = hang[bone_name]
for bone_name in pull:
    arms_up["dirs"][bone_name] = pull[bone_name]

CLIP = {
    "frames": [1, 37, 73],
    "keys": [arms_down, arms_up, arms_down],
    "view": "side",
}
