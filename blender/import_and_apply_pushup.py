import bpy

pushup_fbx_path = r"C:\Users\SREELAKSHMI\Downloads\Push Up.fbx"

# Find if any armature already has the Mixamo push-up action
source_armature = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        if obj.animation_data is not None and obj.animation_data.action is not None:
            act = obj.animation_data.action
            if act.frame_range[1] > 5:
                source_armature = obj
                break

# If not present in the scene, import Push Up.fbx
if source_armature is None:
    print("Importing Push Up.fbx from: " + pushup_fbx_path)
    bpy.ops.import_scene.fbx(filepath=pushup_fbx_path)
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            if obj.animation_data is not None and obj.animation_data.action is not None:
                if obj.animation_data.action.frame_range[1] > 5:
                    source_armature = obj
                    break

if source_armature is None:
    print("Error: Could not find or import the Push Up armature.")
else:
    action = source_armature.animation_data.action
    frame_start = int(action.frame_range[0])
    frame_end = int(action.frame_range[1])
    
    scene = bpy.context.scene
    scene.frame_start = frame_start
    scene.frame_end = frame_end
    scene.frame_current = frame_start
    
    print("Push-Up source: " + source_armature.name)
    print("Frame range: " + str(frame_start) + " to " + str(frame_end))
    
    # Apply to all other armatures in the scene
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE' and obj != source_armature:
            print("Transferring Push-Up to: " + obj.name)
            
            # Map bones by Mixamo base name
            for target_bone in obj.pose.bones:
                base_name = target_bone.name.split(":")[-1]
                
                for source_bone in source_armature.pose.bones:
                    if source_bone.name.endswith(":" + base_name) or source_bone.name == base_name:
                        c = target_bone.constraints.new('COPY_TRANSFORMS')
                        c.target = source_armature
                        c.subtarget = source_bone.name
                        break
            
            # Bake motion capture into target armature
            bpy.context.view_layer.objects.active = obj
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
            print("Finished transfer to: " + obj.name)

    # Place characters side by side (1.2m apart)
    all_armatures = []
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            all_armatures.append(obj)
            
    offset_x = 0.0
    for arm in all_armatures:
        arm.location.x = offset_x
        offset_x = offset_x + 1.2
        
    scene.frame_set(1)
    print("Done! Both characters are now doing the push-up simultaneously.")
