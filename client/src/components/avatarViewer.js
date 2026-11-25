import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinnedModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import exercisesData from '../data/exercises.json';

// Built by blender/build_avatar.py: both characters, one named clip per exercise
const AVATAR_URL = '/models/avatar.glb';

// The two characters share the file; their skeletons have different bone-name prefixes
const SKELETON_PREFIX = { female: 'mixamorig2', male: 'mixamorig9' };

// Camera direction for each "avatarView" in exercises.json. The characters face +Z.
const VIEW_DIRECTIONS = {
  front: new THREE.Vector3(0, 0.15, 1),
  side: new THREE.Vector3(1, 0.12, 0.45),
};

// Bones sit inside the body, so pad the framing box to include skin and clothes
const BODY_PADDING = 0.12;
const FRAMING_SAMPLES = 6;

let avatarPromise = null;

// Downloads avatar.glb once; every viewer on the page shares it
export function loadAvatar() {
  if (!avatarPromise) {
    const loader = new GLTFLoader();
    // avatar.glb is meshopt-compressed; three.js cannot read it without this decoder
    loader.setMeshoptDecoder(MeshoptDecoder);
    avatarPromise = loader.loadAsync(AVATAR_URL).catch((error) => {
      avatarPromise = null; // let the next viewer try again
      throw error;
    });
  }
  return avatarPromise;
}

// Returns { clip, view } for an exercise id, or null when the exercise has no 3D clip
export function getAvatarSettings(exerciseId) {
  const exercise = exercisesData.exercises.find((item) => item.id === exerciseId);
  if (!exercise || !exercise.avatarClip) {
    return null;
  }
  return {
    clip: exercise.avatarClip,
    view: exercise.avatarView === 'front' ? 'front' : 'side',
  };
}

// Draws one looping exercise clip into `container`.
// Returns controls for play/pause and speed, and dispose() for cleanup.
export function createAvatarViewer({
  container,
  clipName,
  view = 'side',
  gender = 'female',
  playing = true,
  speed = 1,
  interactive = false,
  canvasClassName = '',
  onReady,
  onError,
}) {
  let disposed = false;
  let mixer = null;
  let action = null;
  let framing = null;
  let hasFramed = false;
  let isVisible = true;
  let isPlaying = playing;
  let playbackSpeed = speed;
  let frameId = null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = canvasClassName;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(2.5, 4, 3);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.9);
  rimLight.position.set(-3, 2, -2);
  scene.add(rimLight);

  let controls = null;
  if (interactive) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
  }

  // Back the camera off until every corner of the movement's box is inside the picture,
  // keeping the current viewing angle
  const fitCamera = () => {
    if (!framing) return;
    const tanHalfVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const tanHalfHorizontal = tanHalfVertical * camera.aspect;

    const direction = hasFramed
      ? camera.position.clone().sub(framing.center)
      : VIEW_DIRECTIONS[view].clone();
    direction.normalize();

    // Screen axes for a camera looking back along `direction`
    const screenRight = new THREE.Vector3().crossVectors(direction.clone().negate(), camera.up).normalize();
    const screenUp = new THREE.Vector3().crossVectors(screenRight, direction.clone().negate()).normalize();

    let distance = 0;
    const offset = new THREE.Vector3();
    for (const corner of framing.corners) {
      offset.copy(corner).sub(framing.center);
      // A corner nearer the camera needs extra distance to stay in view
      const towardCamera = offset.dot(direction);
      const needWidth = towardCamera + Math.abs(offset.dot(screenRight)) / tanHalfHorizontal;
      const needHeight = towardCamera + Math.abs(offset.dot(screenUp)) / tanHalfVertical;
      distance = Math.max(distance, needWidth, needHeight);
    }
    distance *= 1.04;

    camera.position.copy(framing.center).addScaledVector(direction, distance);
    camera.lookAt(framing.center);
    hasFramed = true;

    if (controls) {
      controls.target.copy(framing.center);
      controls.minDistance = distance * 0.5;
      controls.maxDistance = distance * 2;
      controls.update();
    }
  };

  const resize = () => {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    fitCamera();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // Off-screen avatars (for example cards scrolled out of view) stop drawing
  const visibilityObserver = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
  });
  visibilityObserver.observe(container);

  const timer = new THREE.Timer();
  const animate = (timestamp) => {
    frameId = requestAnimationFrame(animate);
    timer.update(timestamp);
    // Cap the step so a long pause (for example a background tab) doesn't jump the animation
    const delta = Math.min(timer.getDelta(), 0.1);
    if (!isVisible) return;
    if (mixer) mixer.update(delta);
    if (controls) controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    timer.dispose();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    if (controls) controls.dispose();
    if (mixer) {
      mixer.stopAllAction();
      mixer.uncacheRoot(mixer.getRoot());
    }
    // Geometry, materials and textures are shared with the cached model, so they stay alive
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };

  const fail = (error) => {
    if (disposed) return;
    dispose();
    if (onError) onError(error);
  };

  loadAvatar()
    .then((gltf) => {
      if (disposed) return;

      const clip = gltf.animations.find((item) => item.name === clipName);
      if (!clip) {
        fail(new Error(`Clip "${clipName}" is missing from ${AVATAR_URL}`));
        return;
      }

      // Each viewer animates its own copy; skinned meshes need SkeletonUtils to clone correctly
      const model = cloneSkinnedModel(gltf.scene);

      // Keep only the chosen character
      const keepPrefix = SKELETON_PREFIX[gender] || SKELETON_PREFIX.female;
      const otherMeshes = [];
      let bones = null;
      model.traverse((child) => {
        if (!child.isSkinnedMesh) return;
        if (child.skeleton.bones[0].name.startsWith(keepPrefix)) {
          bones = child.skeleton.bones;
          // Bounds come from the standing bind pose; lying poses would be culled by mistake
          child.frustumCulled = false;
        } else {
          otherMeshes.push(child);
        }
      });
      otherMeshes.forEach((mesh) => mesh.removeFromParent());
      if (!bones) {
        fail(new Error(`No ${gender} character in ${AVATAR_URL}`));
        return;
      }
      scene.add(model);

      mixer = new THREE.AnimationMixer(model);
      action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();

      // Frame the whole movement: sample the clip and collect every bone position
      const box = new THREE.Box3();
      const point = new THREE.Vector3();
      for (let sample = 0; sample < FRAMING_SAMPLES; sample += 1) {
        mixer.setTime((clip.duration * sample) / FRAMING_SAMPLES);
        model.updateMatrixWorld(true);
        bones.forEach((bone) => {
          bone.getWorldPosition(point);
          box.expandByPoint(point);
        });
      }
      box.expandByScalar(BODY_PADDING);
      const corners = [];
      for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) {
            corners.push(new THREE.Vector3(x, y, z));
          }
        }
      }
      framing = { center: box.getCenter(new THREE.Vector3()), corners };

      // A paused avatar shows the middle of the rep, the most telling position
      mixer.setTime(isPlaying ? 0 : clip.duration / 2);
      action.setEffectiveTimeScale(playbackSpeed);
      action.paused = !isPlaying;

      resize();
      if (onReady) onReady();
    })
    .catch(fail);

  return {
    setPlaying(value) {
      isPlaying = value;
      if (action) action.paused = !value;
    },
    setSpeed(value) {
      playbackSpeed = value;
      if (action) action.setEffectiveTimeScale(value);
    },
    dispose,
  };
}
