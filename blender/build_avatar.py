# Builds client/public/models/avatar.glb: the female and male characters with one named
# animation clip per exercise. Each clip's poses live in blender/clips/<clip>.py.
#
# Run from the repo root:
#   blender.cmd --background --python blender/build_avatar.py
# Preview only (renders every keyframe to PNG files, does not export):
#   blender.cmd --background --python blender/build_avatar.py -- --preview --only squat,lunge
#
# The Mixamo characters Ch22_nonPBR.fbx (female) and Ch31_nonPBR.fbx (male) are read from the
# folder in the FAS_CHARACTER_DIR environment variable, or from your Downloads folder.

import bpy
import math
import os
import subprocess
import sys
import tempfile
from mathutils import Matrix, Vector

print("\n=== FITNESS AVATAR SIMULATOR: BUILD AVATAR ===\n")

# ---------------------------------------------------------------------------
# Step 1: settings and command-line options
# ---------------------------------------------------------------------------
blender_dir = os.path.dirname(os.path.abspath(__file__))
repo_dir = os.path.dirname(blender_dir)
clips_dir = os.path.join(blender_dir, "clips")
output_path = os.path.join(repo_dir, "client", "public", "models", "avatar.glb")
raw_path = os.path.join(tempfile.gettempdir(), "fas_avatar_raw.glb")
preview_dir = os.path.join(tempfile.gettempdir(), "fas_avatar_preview")

character_dir = os.environ.get("FAS_CHARACTER_DIR", os.path.join(os.path.expanduser("~"), "Downloads"))
characters = [
    {"file": "Ch22_nonPBR.fbx", "name": "Avatar_Female"},
    {"file": "Ch31_nonPBR.fbx", "name": "Avatar_Male"},
]

# Same order as the exercise list in issue #14
clip_order = [
    "squat",
    "push_up",
    "bicep_curl",
    "shoulder_press",
    "lateral_raise",
    "overhead_triceps_extension",
    "lunge",
    "bent_over_row",
    "dumbbell_chest_press",
    "crunch",
    "superman",
    "plank",
]

script_args = []
if "--" in sys.argv:
    script_args = sys.argv[sys.argv.index("--") + 1:]

preview_mode = "--preview" in script_args
only_clips = None
if "--only" in script_args:
    only_clips = script_args[script_args.index("--only") + 1].split(",")

# Bones the clip files can pose, parents always before children
bone_order = [
    "Spine", "Spine1", "Spine2", "Neck", "Head",
    "LeftArm", "LeftForeArm", "LeftHand",
    "RightArm", "RightForeArm", "RightHand",
    "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
    "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
]

# Every bone that gets a keyframe in every clip
keyed_bones = ["Hips"]
for bone_name in bone_order:
    keyed_bones.append(bone_name)

# Limbs a clip can pin in place: two-bone chain, end bone, and bones that keep their direction
limbs = {
    "LeftFoot": {"upper": "LeftUpLeg", "lower": "LeftLeg", "end": "LeftFoot", "keep": ["LeftFoot", "LeftToeBase"]},
    "RightFoot": {"upper": "RightUpLeg", "lower": "RightLeg", "end": "RightFoot", "keep": ["RightFoot", "RightToeBase"]},
    "LeftHand": {"upper": "LeftArm", "lower": "LeftForeArm", "end": "LeftHand", "keep": ["LeftHand"]},
    "RightHand": {"upper": "RightArm", "lower": "RightForeArm", "end": "RightHand", "keep": ["RightHand"]},
}

# Directions in the clip files are (right, forward, up) of a character facing forward.
# Mixamo characters face -Y in Blender with their right side at -X, so (x, y, z) -> (-x, -y, z).

# ---------------------------------------------------------------------------
# Step 2: load the clip files
# ---------------------------------------------------------------------------
clips = {}
for clip_name in clip_order:
    if only_clips is not None and clip_name not in only_clips:
        continue
    clip_file = open(os.path.join(clips_dir, clip_name + ".py"))
    namespace = {}
    exec(clip_file.read(), namespace)
    clip_file.close()
    clips[clip_name] = namespace["CLIP"]
    print("Loaded clip: " + clip_name)

# ---------------------------------------------------------------------------
# Step 3: empty scene and import both characters
# ---------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

for character in characters:
    fbx_path = os.path.join(character_dir, character["file"])
    if not os.path.exists(fbx_path):
        print("ERROR: character file not found: " + fbx_path)
        print("Set FAS_CHARACTER_DIR to the folder that contains " + character["file"])
        sys.exit(1)

    names_before = []
    for obj in bpy.data.objects:
        names_before.append(obj.name)

    bpy.ops.import_scene.fbx(filepath=fbx_path)

    armature = None
    meshes = []
    for obj in bpy.data.objects:
        if obj.name in names_before:
            continue
        if obj.type == 'ARMATURE':
            armature = obj
        if obj.type == 'MESH':
            meshes.append(obj)

    armature.name = character["name"]

    # The FBX import attaches a one-frame action; it would overwrite our poses whenever
    # Blender re-evaluates animation (for example when rendering), so remove it
    armature.animation_data_create()
    imported_action = armature.animation_data.action
    armature.animation_data.action = None
    if imported_action is not None:
        bpy.data.actions.remove(imported_action)

    # Look bones up by their name without the mixamorig prefix
    bones = {}
    for pose_bone in armature.pose.bones:
        pose_bone.rotation_mode = 'QUATERNION'
        pose_bone.matrix_basis = Matrix.Identity(4)
        bones[pose_bone.name.split(":")[-1]] = pose_bone

    character["armature"] = armature
    character["meshes"] = meshes
    character["bones"] = bones
    print("Imported " + character["file"] + " as " + armature.name)

# The FBX import switches the scene to the file's 30 fps; the clips are timed for 24 fps
# (72 frames = one 3-second rep), so set it back after importing
scene.render.fps = 24
scene.render.fps_base = 1.0
bpy.context.view_layer.update()

# Rest-pose measurements: floor height (lowest point of the shoes) and limb lengths
for character in characters:
    armature = character["armature"]
    bones = character["bones"]
    world = armature.matrix_world

    depsgraph = bpy.context.evaluated_depsgraph_get()
    lowest = None
    for mesh_obj in character["meshes"]:
        evaluated = mesh_obj.evaluated_get(depsgraph)
        mesh_data = evaluated.to_mesh()
        for vertex in mesh_data.vertices:
            z = (evaluated.matrix_world @ vertex.co).z
            if lowest is None or z < lowest:
                lowest = z
        evaluated.to_mesh_clear()
    character["floor_z"] = lowest

    character["limb_lengths"] = {}
    for limb_name in limbs:
        limb = limbs[limb_name]
        upper_start = world @ bones[limb["upper"]].head
        lower_start = world @ bones[limb["lower"]].head
        end_start = world @ bones[limb["end"]].head
        character["limb_lengths"][limb_name] = ((lower_start - upper_start).length, (end_start - lower_start).length)

# ---------------------------------------------------------------------------
# Step 4: preview camera and floor (preview mode only)
# ---------------------------------------------------------------------------
camera_obj = None
if preview_mode:
    os.makedirs(preview_dir, exist_ok=True)
    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera_obj = bpy.data.objects.new("PreviewCamera", camera_data)
    scene.collection.objects.link(camera_obj)
    scene.camera = camera_obj
    bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0.0, 0.0, characters[0]["floor_z"]))
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 420
    scene.render.resolution_y = 420
    # Only the female character is rendered in previews
    for mesh_obj in characters[1]["meshes"]:
        mesh_obj.hide_render = True

# ---------------------------------------------------------------------------
# Step 5: pose every keyframe of every clip and write the actions
# ---------------------------------------------------------------------------
for character_index in range(len(characters)):
    character = characters[character_index]
    if preview_mode and character_index > 0:
        continue

    armature = character["armature"]
    bones = character["bones"]
    hips = bones["Hips"]
    world = armature.matrix_world.copy()
    world_inverse = world.inverted()

    rest_hips = world @ hips.bone.matrix_local
    rest_hips_head = rest_hips.translation.copy()
    rest_hips_turn = rest_hips.copy()
    rest_hips_turn.translation = Vector((0.0, 0.0, 0.0))

    for clip_name in clip_order:
        if clip_name not in clips:
            continue
        clip = clips[clip_name]
        keys = clip["keys"]
        frames = clip["frames"]
        pins = clip.get("pins", [])
        poles = clip.get("poles", {})
        anchor_name = clip.get("anchor")

        first_root_head = None
        anchor_target = None
        pinned_targets = {}
        kept_dirs = {}
        key_values = []

        for key_index in range(len(keys)):
            key = keys[key_index]

            # 5a. Back to the rest pose
            for pose_bone in armature.pose.bones:
                pose_bone.matrix_basis = Matrix.Identity(4)
            bpy.context.view_layer.update()

            # 5b. Turn and place the hips (the root of the skeleton)
            up_value = key.get("root_up", (0.0, 0.0, 1.0))
            facing_value = key.get("root_facing", (0.0, 1.0, 0.0))
            up_world = Vector((-up_value[0], -up_value[1], up_value[2])).normalized()
            facing_world = Vector((-facing_value[0], -facing_value[1], facing_value[2]))
            facing_world = (facing_world - up_world * facing_world.dot(up_world)).normalized()
            right_world = facing_world.cross(up_world).normalized()
            target_frame = Matrix((right_world, facing_world, up_world)).transposed()
            rest_frame = Matrix(((-1.0, 0.0, 0.0), (0.0, -1.0, 0.0), (0.0, 0.0, 1.0)))
            root_turn = target_frame @ rest_frame.transposed()

            if key_index == 0:
                root_head = rest_hips_head.copy()
            else:
                offset_value = key.get("root_offset", (0.0, 0.0, 0.0))
                root_head = first_root_head + Vector((-offset_value[0], -offset_value[1], offset_value[2]))

            hips.matrix = world_inverse @ (Matrix.Translation(root_head) @ root_turn.to_4x4() @ rest_hips_turn)
            bpy.context.view_layer.update()

            # Bones of pinned limbs are solved later, not taken from the clip file
            pinned_bone_names = []
            if key_index > 0:
                for limb_name in pins:
                    limb = limbs[limb_name]
                    pinned_bone_names.append(limb["upper"])
                    pinned_bone_names.append(limb["lower"])
                    for keep_name in limb["keep"]:
                        pinned_bone_names.append(keep_name)

            # 5c. Point bones in their target directions: body first, then pinned limbs
            for phase in ["body", "limbs"]:
                jobs = []

                if phase == "body":
                    world_dirs = key.get("dirs", {})
                    body_dirs = key.get("body_dirs", {})
                    for bone_name in bone_order:
                        if bone_name in pinned_bone_names:
                            continue
                        if bone_name in world_dirs:
                            value = world_dirs[bone_name]
                            jobs.append((bone_name, Vector((-value[0], -value[1], value[2])).normalized()))
                        elif bone_name in body_dirs:
                            # Body directions turn together with the hips
                            value = body_dirs[bone_name]
                            jobs.append((bone_name, (root_turn @ Vector((-value[0], -value[1], value[2]))).normalized()))

                if phase == "limbs" and key_index > 0:
                    # Slide the whole body so the anchor point stays where it was in keyframe 1
                    if anchor_name is not None:
                        shift = anchor_target - (world @ bones[anchor_name].head)
                        hips.matrix = world_inverse @ (Matrix.Translation(shift) @ (world @ hips.matrix))
                        bpy.context.view_layer.update()

                    # Two-bone solve: bend the middle joint toward the pole so the end reaches its pin
                    for limb_name in pins:
                        limb = limbs[limb_name]
                        upper_length = character["limb_lengths"][limb_name][0]
                        lower_length = character["limb_lengths"][limb_name][1]
                        start_point = world @ bones[limb["upper"]].head
                        to_target = pinned_targets[limb_name] - start_point
                        distance = to_target.length
                        longest = (upper_length + lower_length) * 0.999
                        shortest = abs(upper_length - lower_length) + 0.01
                        if distance > longest:
                            distance = longest
                        if distance < shortest:
                            distance = shortest
                        along = to_target.normalized()

                        pole_value = poles.get(limb_name, (0.0, 1.0, 0.0))
                        pole_world = Vector((-pole_value[0], -pole_value[1], pole_value[2]))
                        bend_side = (pole_world - along * pole_world.dot(along)).normalized()

                        cos_angle = (upper_length * upper_length + distance * distance - lower_length * lower_length) / (2.0 * upper_length * distance)
                        if cos_angle > 1.0:
                            cos_angle = 1.0
                        if cos_angle < -1.0:
                            cos_angle = -1.0
                        angle = math.acos(cos_angle)
                        joint_point = start_point + along * (upper_length * math.cos(angle)) + bend_side * (upper_length * math.sin(angle))
                        end_point = start_point + along * distance

                        jobs.append((limb["upper"], (joint_point - start_point).normalized()))
                        jobs.append((limb["lower"], (end_point - joint_point).normalized()))
                        for keep_name in limb["keep"]:
                            jobs.append((keep_name, kept_dirs[limb_name + ":" + keep_name]))

                # Turn each bone around its own head so its head-to-tail line points at the target
                for job in jobs:
                    pose_bone = bones[job[0]]
                    target_dir = job[1]
                    head_world = world @ pose_bone.head
                    current_dir = (world @ pose_bone.tail - head_world).normalized()
                    turn = current_dir.rotation_difference(target_dir)
                    new_matrix = Matrix.Translation(head_world) @ turn.to_matrix().to_4x4() @ Matrix.Translation(-head_world) @ (world @ pose_bone.matrix)
                    pose_bone.matrix = world_inverse @ new_matrix
                    bpy.context.view_layer.update()

            # 5d. Keyframe 1 only: stand the body on the floor and remember the pinned points
            if key_index == 0:
                depsgraph = bpy.context.evaluated_depsgraph_get()
                lowest = None
                for mesh_obj in character["meshes"]:
                    evaluated = mesh_obj.evaluated_get(depsgraph)
                    mesh_data = evaluated.to_mesh()
                    for vertex in mesh_data.vertices:
                        z = (evaluated.matrix_world @ vertex.co).z
                        if lowest is None or z < lowest:
                            lowest = z
                    evaluated.to_mesh_clear()
                lift = Vector((0.0, 0.0, character["floor_z"] - lowest))
                hips.matrix = world_inverse @ (Matrix.Translation(lift) @ (world @ hips.matrix))
                bpy.context.view_layer.update()

                first_root_head = world @ hips.head
                for limb_name in pins:
                    limb = limbs[limb_name]
                    pinned_targets[limb_name] = world @ bones[limb["end"]].head
                    for keep_name in limb["keep"]:
                        keep_bone = bones[keep_name]
                        kept_dirs[limb_name + ":" + keep_name] = (world @ keep_bone.tail - world @ keep_bone.head).normalized()
                if anchor_name is not None:
                    anchor_target = world @ bones[anchor_name].head

            # 5e. Remember this keyframe's values
            values = {}
            for bone_name in keyed_bones:
                values[bone_name] = bones[bone_name].rotation_quaternion.copy()
            values["Hips_location"] = hips.location.copy()
            key_values.append(values)

            # 5f. Preview: render this keyframe from the clip's camera side
            if preview_mode and key_index < len(keys) - 1:
                low_corner = None
                high_corner = None
                for bone_name in keyed_bones:
                    point = world @ bones[bone_name].head
                    if low_corner is None:
                        low_corner = point.copy()
                        high_corner = point.copy()
                    for axis in range(3):
                        if point[axis] < low_corner[axis]:
                            low_corner[axis] = point[axis]
                        if point[axis] > high_corner[axis]:
                            high_corner[axis] = point[axis]
                center = (low_corner + high_corner) / 2.0
                radius = (high_corner - low_corner).length / 2.0 + 0.3
                # Two pictures: the clip's own camera side, and a flat side view to check floor contact
                if clip.get("view") == "front":
                    clip_look = Vector((0.0, -1.0, 0.15)).normalized()
                else:
                    clip_look = Vector((1.0, -0.45, 0.12)).normalized()
                previews = [("view", clip_look), ("flat", Vector((1.0, 0.0, 0.02)).normalized())]
                for preview in previews:
                    camera_obj.location = center + preview[1] * (radius / math.sin(math.radians(19.0)))
                    camera_obj.rotation_euler = (center - camera_obj.location).to_track_quat('-Z', 'Y').to_euler()
                    scene.render.filepath = os.path.join(preview_dir, clip_name + "_" + str(key_index) + "_" + preview[0] + ".png")
                    bpy.ops.render.render(write_still=True)
                    print("Preview: " + scene.render.filepath)

        # 5g. Write the keyframes into a new action
        action = bpy.data.actions.new(clip_name + "_" + armature.name)
        armature.animation_data.action = action
        previous = {}
        for key_index in range(len(keys)):
            frame = frames[key_index]
            values = key_values[key_index]
            for bone_name in keyed_bones:
                pose_bone = bones[bone_name]
                quat = values[bone_name].copy()
                # Keep the same sign as the last keyframe so the turn does not go the long way round
                if bone_name in previous and previous[bone_name].dot(quat) < 0.0:
                    quat.negate()
                pose_bone.rotation_quaternion = quat
                pose_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=pose_bone.name)
                previous[bone_name] = quat
            hips.location = values["Hips_location"]
            hips.keyframe_insert(data_path="location", frame=frame, group=hips.name)

        # 5h. Move the action into its own NLA track; the track name becomes the glTF clip name
        track = armature.animation_data.nla_tracks.new()
        track.name = clip_name
        strip = track.strips.new(clip_name, int(frames[0]), action)
        if hasattr(strip, "action_slot") and strip.action_slot is None and len(action.slots) > 0:
            strip.action_slot = action.slots[0]
        armature.animation_data.action = None
        # Muted while the next clips are built, so it cannot change the pose under them
        track.mute = True
        print("Built clip '" + clip_name + "' for " + armature.name)

if preview_mode:
    print("\nPreview images are in: " + preview_dir)
    sys.exit(0)

# ---------------------------------------------------------------------------
# Step 6: export the GLB and compress it
# ---------------------------------------------------------------------------
for character in characters:
    armature = character["armature"]
    for pose_bone in armature.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)
    for track in armature.animation_data.nla_tracks:
        track.mute = False
scene.frame_set(1)

bpy.ops.export_scene.gltf(
    filepath=raw_path,
    export_format='GLB',
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_force_sampling=True,
    export_skins=True,
    export_morph=False,
)
print("Exported raw GLB: " + raw_path + " (" + str(round(os.path.getsize(raw_path) / 1048576.0, 2)) + " MB)")

compress_command = (
    'npx --yes @gltf-transform/cli optimize "' + raw_path + '" "' + output_path + '"'
    + " --texture-size 1024 --texture-compress webp --compress meshopt --flatten false --join false"
)
print("Compressing: " + compress_command)
result = subprocess.run(compress_command, shell=True, cwd=repo_dir)
if result.returncode != 0:
    print("ERROR: compression failed. Run the command above by hand from the repo root.")
    sys.exit(1)

print("\nSUCCESS: " + output_path + " (" + str(round(os.path.getsize(output_path) / 1048576.0, 2)) + " MB)")
