import bpy

# Find which armature has the push-up animation and which does not
animated_armature = None
unanimated_armatures = []

for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        has_anim = False
        if obj.animation_data is not None and obj.animation_data.action is not None:
            if obj.animation_data.action.frame_range[1] > 5:
                has_anim = True
        
        if has_anim and animated_armature is None:
            animated_armature = obj
        else:
            unanimated_armatures.append(obj)

# If no armature currently in the scene has the animation, import Push Up.fbx
if animated_armature is None:
    pushup_fbx = r"C:\Users\SREELAKSHMI\Downloads\Push Up.fbx"
    print("Importing animated Push Up.fbx...")
    bpy.ops.import_scene.fbx(filepath=pushup_fbx)
    
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            if obj.animation_data is not None and obj.animation_data.action is not None:
                if obj.animation_data.action.frame_range[1] > 5:
                    animated_armature = obj
                    break

if animated_armature is None:
    print("Error: Could not find any push-up animation in scene or downloads.")
else:
    action = animated_armature.animation_data.action
    frame_start = int(action.frame_range[0])
    frame_end = int(action.frame_range[1])
    
    scene = bpy.context.scene
    scene.frame_start = frame_start
    scene.frame_end = frame_end
    scene.frame_current = frame_start
    
    print("Source animation from: " + animated_armature.name)
    
    # Transfer the push-up animation to all other armatures
    for target_arm in unanimated_armatures:
        if target_arm == animated_armature:
            continue
            
        print("Transferring push-up to: " + target_arm.name)
        
        # Link matching bones
        for target_bone in target_arm.pose.bones:
            base_name = target_bone.name.split(":")[-1]
            
            for source_bone in animated_armature.pose.bones:
                if source_bone.name.endswith(":" + base_name) or source_bone.name == base_name:
                    c = target_bone.constraints.new('COPY_TRANSFORMS')
                    c.target = animated_armature
                    c.subtarget = source_bone.name
                    break
        
        # Bake keyframes
        bpy.context.view_layer.objects.active = target_arm
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
        print("Done transferring to: " + target_arm.name)

    # Offset characters so they stand side-by-side
    all_arms = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    curr_x = 0.0
    for arm in all_arms:
        arm.location.x = curr_x
        curr_x += 1.3

    scene.frame_set(1)
    print("SUCCESS: Both characters are now animated! Press Spacebar to play.")
