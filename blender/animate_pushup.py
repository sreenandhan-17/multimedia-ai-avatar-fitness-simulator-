import bpy
import math

# Target armatures (male and female characters)
preferred_armatures = ["Armature", "Armature.001"]

armatures_to_process = []

# First, look for the preferred armatures
for name in preferred_armatures:
    obj = bpy.data.objects.get(name)
    if obj is not None:
        if obj.type == 'ARMATURE':
            armatures_to_process.append(obj)

# If not found by exact name, detect any armatures in the scene
if len(armatures_to_process) == 0:
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armatures_to_process.append(obj)

print("Found " + str(len(armatures_to_process)) + " armature(s) to animate.")

# Setup timeline for 60-frame looping cycle
scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = 60
scene.frame_current = 1

# Frame 1 and 60: High plank starting position
# Arms brought down from T-pose (75 deg on X) and forward (25 deg on Z) under the chest
high_plank_rotations = {
    "Hips": (math.radians(-75.0), 0.0, 0.0),
    "Spine": (math.radians(2.0), 0.0, 0.0),
    "Spine1": (0.0, 0.0, 0.0),
    "Spine2": (0.0, 0.0, 0.0),
    "Neck": (math.radians(10.0), 0.0, 0.0),
    "Head": (math.radians(12.0), 0.0, 0.0),
    # Upper arms brought down from T-pose directly into push-up support
    "LeftArm": (math.radians(75.0), math.radians(-15.0), math.radians(25.0)),
    "RightArm": (math.radians(75.0), math.radians(15.0), math.radians(-25.0)),
    # Forearms extended (straight push-up arms)
    "LeftForeArm": (0.0, 0.0, math.radians(10.0)),
    "RightForeArm": (0.0, 0.0, math.radians(-10.0)),
    # Hands bent flat on floor
    "LeftHand": (math.radians(-70.0), 0.0, math.radians(-20.0)),
    "RightHand": (math.radians(-70.0), 0.0, math.radians(20.0)),
    # Straight core and legs
    "LeftUpLeg": (0.0, 0.0, 0.0),
    "RightUpLeg": (0.0, 0.0, 0.0),
    "LeftLeg": (0.0, 0.0, 0.0),
    "RightLeg": (0.0, 0.0, 0.0),
    # Ankles flexed with toes on ground
    "LeftFoot": (math.radians(70.0), 0.0, 0.0),
    "RightFoot": (math.radians(70.0), 0.0, 0.0),
    "LeftToeBase": (math.radians(20.0), 0.0, 0.0),
    "RightToeBase": (math.radians(20.0), 0.0, 0.0)
}

# Frame 30: Lowered push-up position
# Elbows flexed 90 degrees, upper arms angled at 45 degrees to torso
lowered_plank_rotations = {
    "Hips": (math.radians(-80.0), 0.0, 0.0),
    "Spine": (math.radians(2.0), 0.0, 0.0),
    "Spine1": (0.0, 0.0, 0.0),
    "Spine2": (0.0, 0.0, 0.0),
    "Neck": (math.radians(10.0), 0.0, 0.0),
    "Head": (math.radians(12.0), 0.0, 0.0),
    # Upper arms flared backward ~45 degrees
    "LeftArm": (math.radians(60.0), math.radians(-35.0), math.radians(45.0)),
    "RightArm": (math.radians(60.0), math.radians(35.0), math.radians(-45.0)),
    # Elbows bent to 90 degrees
    "LeftForeArm": (0.0, 0.0, math.radians(90.0)),
    "RightForeArm": (0.0, 0.0, math.radians(-90.0)),
    # Wrists maintain contact
    "LeftHand": (math.radians(-70.0), 0.0, math.radians(-20.0)),
    "RightHand": (math.radians(-70.0), 0.0, math.radians(20.0)),
    # Straight core and legs
    "LeftUpLeg": (0.0, 0.0, 0.0),
    "RightUpLeg": (0.0, 0.0, 0.0),
    "LeftLeg": (0.0, 0.0, 0.0),
    "RightLeg": (0.0, 0.0, 0.0),
    "LeftFoot": (math.radians(75.0), 0.0, 0.0),
    "RightFoot": (math.radians(75.0), 0.0, 0.0),
    "LeftToeBase": (math.radians(20.0), 0.0, 0.0),
    "RightToeBase": (math.radians(20.0), 0.0, 0.0)
}

# Hips location in armature coordinates
hips_locations = {
    1: (0.0, -15.0, -50.0),
    30: (0.0, -15.0, -75.0),
    60: (0.0, -15.0, -50.0)
}

frames = [1, 30, 60]

for armature_obj in armatures_to_process:
    print("Animating: " + armature_obj.name)
    
    # Set as active and enter Pose mode
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode='POSE')
    
    # Process each keyframe in the cycle
    for frame_number in frames:
        scene.frame_set(frame_number)
        
        if frame_number == 30:
            pose_rotations = lowered_plank_rotations
        else:
            pose_rotations = high_plank_rotations
        
        # Match each base bone across namespace prefixes (e.g. mixamorig2:, mixamorig9:)
        for base_bone_name, rotation_values in pose_rotations.items():
            target_bone = None
            for pose_bone in armature_obj.pose.bones:
                if pose_bone.name == base_bone_name:
                    target_bone = pose_bone
                    break
                if pose_bone.name.endswith(":" + base_bone_name):
                    target_bone = pose_bone
                    break
                if pose_bone.name.endswith("_" + base_bone_name):
                    target_bone = pose_bone
                    break
            
            if target_bone is not None:
                target_bone.rotation_mode = 'XYZ'
                target_bone.rotation_euler = rotation_values
                target_bone.keyframe_insert(data_path="rotation_euler", frame=frame_number)
                
                # Animate hips location
                if base_bone_name == "Hips":
                    target_bone.location = hips_locations[frame_number]
                    target_bone.keyframe_insert(data_path="location", frame=frame_number)
    
    # Return to Object mode
    bpy.ops.object.mode_set(mode='OBJECT')
    print("Successfully animated push-up for: " + armature_obj.name)

# Reset playhead to frame 1
scene.frame_set(1)
print("Push-up animation complete. Press Spacebar in Blender to play!")
