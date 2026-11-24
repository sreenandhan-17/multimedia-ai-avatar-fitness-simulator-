import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Avatar from './Avatar';
import './Avatar3D.css';

/**
 * Hook to load a GLTF model asset (defaults to bicep curl avatar)
 */
export function useGLTF(url = '/models/avatar-bicepcurl.glb') {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      if (!cancelled) setData(gltf);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return data;
}

export default function Avatar3D({
  exercise = 'bicep-curl',
  gender = 'female',
  playing = true,
  speed = 1,
  cameraPosition = [0, 1.2, 3.5],
  controlsTarget = [0, 1.0, 0],
}) {
  const containerRef = useRef(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const actionsRef = useRef([]);

  // Sync speed changes to animation actions
  useEffect(() => {
    actionsRef.current.forEach((action) => {
      action.setEffectiveTimeScale(speed);
    });
  }, [speed]);

  // Sync play/pause changes
  useEffect(() => {
    actionsRef.current.forEach((action) => {
      action.paused = !playing;
    });
  }, [playing]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setModelLoaded(false);
    setLoadError(false);
    actionsRef.current = [];

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera: position [0, 1.2, 3.5] for a straight-on, front-facing view of standing avatar
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 260;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const [camX, camY, camZ] = cameraPosition || [0, 1.2, 3.5];
    camera.position.set(camX, camY, camZ);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'avatar-3d-canvas';

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x06b6d4, 0.9);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // 5. Controls: OrbitControls target at [0, 1.0, 0] focusing on standing posture with full 360° rotation enabled
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = true;
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 6;
    controls.minDistance = 1;
    const [tgtX, tgtY, tgtZ] = controlsTarget || [0, 1.0, 0];
    controls.target.set(tgtX, tgtY, tgtZ);
    controls.update();

    // 6. Load GLTF: prioritize /models/avatar-bicepcurl.glb
    const loader = new GLTFLoader();
    const candidateUrls = [
      '/models/avatar-bicepcurl.glb',
      '/models/avatar-bicep-curl.glb',
      '/models/bicep_curl_avatar.glb',
      `/models/pushup_${gender}.glb`,
      '/models/pushup_avatar.glb',
    ];

    let mixer = null;
    let reqId = null;
    const clock = new THREE.Clock();

    const tryLoad = (index) => {
      if (index >= candidateUrls.length) {
        setLoadError(true);
        return;
      }

      loader.load(
        candidateUrls[index],
        (gltf) => {
          const root = gltf.scene;

          // Toggle visibility: Ch22 is female, Ch08 is male
          root.traverse((child) => {
            const name = child.name || '';
            if (name.includes('Ch22') || name.includes('mixamorig2')) {
              child.visible = gender === 'female';
            } else if (name.includes('Ch08') || name.includes('mixamorig7')) {
              child.visible = gender === 'male';
            } else if (name === 'Armature') {
              child.visible = gender === 'female';
            } else if (name === 'Armature.001') {
              child.visible = gender === 'male';
            }
          });

          // Ensure world matrices are computed before calculating bounding box
          root.updateMatrixWorld(true);

          // Auto-center based ONLY on the visible meshes
          const box = new THREE.Box3();
          root.traverse((child) => {
            if (child.isMesh && child.visible) {
              box.expandByObject(child);
            }
          });

          if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            if (maxDim > 0) {
              const scaleFactor = 1.6 / maxDim;
              root.scale.setScalar(scaleFactor);
              root.position.x = -center.x * scaleFactor;
              root.position.y = -center.y * scaleFactor + 1.0;
              root.position.z = -center.z * scaleFactor;
            }
          }

          scene.add(root);

          // Trigger 'BicepCurl_Female' or 'BicepCurl_Male' depending on the selected gender tab
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(root);
            const activeActions = [];

            const targetClipName = gender === 'female' ? 'BicepCurl_Female' : 'BicepCurl_Male';
            let targetClip = gltf.animations.find((c) => c.name === targetClipName);

            // Fallback matching if names were prefixed by armature or gltf exporter
            if (!targetClip) {
              targetClip = gltf.animations.find((c) =>
                gender === 'female'
                  ? c.name.toLowerCase().includes('female') || c.name.includes('Armature|')
                  : c.name.toLowerCase().includes('male') || c.name.includes('001')
              ) || gltf.animations[0];
            }

            if (targetClip) {
              const action = mixer.clipAction(targetClip);
              action.setEffectiveTimeScale(speed);
              action.paused = !playing;
              action.setLoop(THREE.LoopRepeat);
              action.play();
              activeActions.push(action);
            }

            actionsRef.current = activeActions;
          }

          setModelLoaded(true);
          setLoadError(false);
        },
        undefined,
        () => {
          tryLoad(index + 1);
        },
      );
    };

    tryLoad(0);

    // 7. Animation loop
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (mixer) {
        mixer.update(delta);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(reqId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, [gender, playing, speed]);

  return (
    <div className="avatar-3d-container" ref={containerRef}>
      {loadError ? (
        <div className="avatar-3d-fallback">
          <Avatar exercise={exercise} gender={gender} size="large" playing={playing} speed={speed} />
        </div>
      ) : !modelLoaded ? (
        <div className="avatar-3d-loading">
          <div className="avatar-3d-spinner" />
          <span>Loading {gender === 'female' ? 'Female' : 'Male'} Avatar...</span>
        </div>
      ) : (
        <div className="avatar-3d-overlay-hint">🖱 Drag to rotate 360°</div>
      )}
    </div>
  );
}
