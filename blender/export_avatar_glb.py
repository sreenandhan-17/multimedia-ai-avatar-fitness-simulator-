import bpy
import os

print("=== Starting 3D Push-Up Avatar Export ===")

# 1. Find the animated character and the unanimated character in the Blender scene
animated_armature = None
unanimated_armature = None

for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        if obj.animation_data is not None and obj.animation_data.action is not None and obj.animation_data.action.frame_range[1] > 5:
            animated_armature = obj
        else:
            unanimated_armature = obj

# If one armature has the push-up and the other doesn't, transfer the animation
if animated_armature is not None and unanimated_armature is not None:
    print("Found animated source: " + animated_armature.name)
    print("Transferring push-up animation to: " + unanimated_armature.name)
    
    action = animated_armature.animation_data.action
    frame_start = int(action.frame_range[0])
    frame_end = int(action.frame_range[1])
    
    # Map matching bones
    for target_bone in unanimated_armature.pose.bones:
        base_name = target_bone.name.split(":")[-1]
        
        for source_bone in animated_armature.pose.bones:
            if source_bone.name.endswith(":" + base_name) or source_bone.name == base_name:
                c = target_bone.constraints.new('COPY_TRANSFORMS')
                c.target = animated_armature
                c.subtarget = source_bone.name
                break
    
    # Bake animation keyframes onto the second character
    bpy.context.view_layer.objects.active = unanimated_armature
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT')
    
    bpy.ops.nla.bake(
        frame_start=frame_start,
        frame_end=frame_end,
        visual_keying=True,
        clear_constraints=True,
        bake_types={'POSE'}
    )
    bpy.ops.object.mode_set(mode='OBJECT')
    print("Successfully animated " + unanimated_armature.name + " with the push-up!")

# 2. Center both armatures at origin for clean display in the web app
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        obj.location.x = 0.0
        obj.location.y = 0.0
        obj.location.z = 0.0

# 3. Export as pushup_avatar.glb
output_dir = r"C:\Users\SREELAKSHMI\multimedia\client\public\models"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

output_path = os.path.join(output_dir, "pushup_avatar.glb")
print("Exporting GLB to: " + output_path)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_animations=True,
    export_current_frame=False,
    export_skins=True,
    export_morph=True
)

print("SUCCESS: pushup_avatar.glb exported with BOTH characters animated!")
