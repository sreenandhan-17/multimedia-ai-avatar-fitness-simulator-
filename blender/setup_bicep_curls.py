"""
Setup and export 3D Bicep Curl Avatar (Dual Gender: Male Ch08 & Female Ch22)
Usage:
    blender -b -P ./scripts/setup_bicep_curls.py
"""
import os
import sys
import shutil
import bpy

print("\n=======================================================")
print("FITNESS AVATAR SIMULATOR: BICEP CURL AVATAR SETUP")
print("=======================================================\n")

# 1. Locate Source FBX Files
download_dir = r"C:\Users\SREELAKSHMI\Downloads"
candidate_male_paths = [
    os.path.join(download_dir, "Bicep Curl.fbx"),
    os.path.join(os.getcwd(), "assets", "Bicep Curl.fbx"),
    os.path.join(os.getcwd(), "Bicep Curl.fbx"),
]
candidate_female_paths = [
    os.path.join(download_dir, "Bicep Curl (1).fbx"),
    os.path.join(os.getcwd(), "assets", "Bicep Curl (1).fbx"),
    os.path.join(os.getcwd(), "Bicep Curl (1).fbx"),
]

male_fbx = next((p for p in candidate_male_paths if os.path.exists(p)), None)
female_fbx = next((p for p in candidate_female_paths if os.path.exists(p)), None)

if not male_fbx or not female_fbx:
    print(f"Error: Could not find required FBX files.")
    print(f"   Male FBX found: {male_fbx}")
    print(f"   Female FBX found: {female_fbx}")
    sys.exit(1)

print(f"Found Male FBX: {male_fbx}")
print(f"Found Female FBX: {female_fbx}")

# 2. Reset Scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# 3. Import Female Avatar (Ch22)
print("\n[1/4] Importing Female Character (Ch22)...")
bpy.ops.import_scene.fbx(filepath=female_fbx)
female_armature = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
if not female_armature:
    print("Failed to find Female Armature in imported FBX.")
    sys.exit(1)

female_armature.name = "Armature"  # Standard naming matching pushup model (female = Armature)
print(f"  Female Armature configured: {female_armature.name}")

# 4. Import Male Avatar (Ch08)
print("\n[2/4] Importing Male Character (Ch08)...")
bpy.ops.import_scene.fbx(filepath=male_fbx)
male_armature = next((o for o in bpy.data.objects if o.type == 'ARMATURE' and o != female_armature), None)
if not male_armature:
    print("Failed to find Male Armature in imported FBX.")
    sys.exit(1)

male_armature.name = "Armature.001"  # Standard naming matching pushup model (male = Armature.001)
print(f"  Male Armature configured: {male_armature.name}")

# 5. Position and Frame Alignment
print("\n[3/4] Aligning armatures to origin and configuring animations...")
if female_armature.animation_data and female_armature.animation_data.action:
    female_armature.animation_data.action.name = "BicepCurl_Female"
if male_armature.animation_data and male_armature.animation_data.action:
    male_armature.animation_data.action.name = "BicepCurl_Male"

max_frame = 1
for arm in [female_armature, male_armature]:
    arm.location = (0.0, 0.0, 0.0)
    arm.rotation_euler = (0.0, 0.0, 0.0)
    arm.scale = (1.0, 1.0, 1.0)
    
    # Configure NLA track so glTF exporter includes both actions
    if arm.animation_data and arm.animation_data.action:
        act = arm.animation_data.action
        f_start = int(act.frame_range[0])
        f_end = int(act.frame_range[1])
        if f_end > max_frame:
            max_frame = f_end
        
        # Create NLA track & strip with the clean action name
        track = arm.animation_data.nla_tracks.new()
        track.name = act.name
        track.strips.new(act.name, f_start, act)
        print(f"  {arm.name}: Action '{act.name}' ({f_start} to {f_end} frames) pushed to NLA track")

scene.frame_start = 1
scene.frame_end = max_frame
scene.frame_current = 1
print(f"  Timeline set: 1 to {max_frame} frames")

# 6. Export to GLB
output_dir = os.path.join(os.getcwd(), "client", "public", "models")
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

output_glb = os.path.join(output_dir, "avatar-bicepcurl.glb")
alias_bicep_glb = os.path.join(output_dir, "bicep_curl_avatar.glb")
alias_dash_glb = os.path.join(output_dir, "avatar-bicep-curl.glb")

print(f"\n[4/4] Exporting GLB asset to {output_glb}...")
bpy.ops.export_scene.gltf(
    filepath=output_glb,
    export_format='GLB',
    export_animations=True,
    export_skins=True,
    export_morph=True
)

file_size_mb = os.path.getsize(output_glb) / (1024 * 1024)
print(f"  Successfully exported avatar-bicepcurl.glb ({file_size_mb:.2f} MB)")

# Copy aliases
for alias_path in [alias_bicep_glb, alias_dash_glb]:
    try:
        if os.path.exists(alias_path):
            os.remove(alias_path)
        shutil.copyfile(output_glb, alias_path)
        print(f"  Created alias copy: {alias_path}")
    except Exception as e:
        print(f"  Warning creating alias {alias_path}: {e}")

print("\n=======================================================")
print("BICEP CURL AVATAR SETUP COMPLETE!")
print(f"   Model URL: /models/bicep_curl_avatar.glb")
print(f"   Alias URL: /models/avatar-bicep-curl.glb")
print("=======================================================\n")
