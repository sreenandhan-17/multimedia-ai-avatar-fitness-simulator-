import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './AvatarCanvas.css';

/**
 * AvatarCanvas: A compact, interactive 3D human avatar canvas designed
 * for exercise selection cards (Push-up and Bicep curl).
 */
export default function AvatarCanvas({
  className = '',
  gender: propGender,
  exerciseId = 'push-up',
  cameraPosition,
  controlsTarget,
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Read selected gender from localStorage or default to female
  const gender =
    propGender ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('fitness-avatar-gender') || 'female'
      : 'female');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDisposed = false;
    let mixer = null;
    let animId = null;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera setup framed according to exercise type
    const width = container.clientWidth || 110;
    const height = container.clientHeight || 110;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    const defaultCam =
      exerciseId === 'bicep-curl' ? [0, 1.2, 3.5] : [1.5, 0.95, 1.7];
    const defaultTgt =
      exerciseId === 'bicep-curl' ? [0, 1.0, 0] : [0, 0.28, 0];

    const [camX, camY, camZ] = cameraPosition || defaultCam;
    const [tgtX, tgtY, tgtZ] = controlsTarget || defaultTgt;

    camera.position.set(camX, camY, camZ);

    // 3. Renderer with transparent background matching card surface
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'avatar-canvas-element';
    container.appendChild(renderer.domElement);

    // 4. Subtle lighting matching dark card theme (#0f172a / #0b1329) with cyan rim
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.5, 3.5, 2.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00e5ff, 1.4);
    rimLight.position.set(-2.0, 1.2, -1.8);
    scene.add(rimLight);

    // 5. Controls: OrbitControls with target focusing on the avatar
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(tgtX, tgtY, tgtZ);
    controls.update();

    // 5. Load 3D humanoid GLB model from public/models/
    const loader = new GLTFLoader();
    const candidateUrls =
      exerciseId === 'bicep-curl'
        ? [
            '/models/avatar-bicepcurl.glb',
            '/models/avatar-bicep-curl.glb',
            '/models/bicep_curl_avatar.glb',
          ]
        : ['/models/avatar-pushup.glb', '/models/pushup_avatar.glb'];

    let lastTime = performance.now();

    const loadModel = (urlIndex = 0) => {
      if (urlIndex >= candidateUrls.length) {
        if (!isDisposed) {
          setLoadError(true);
          setLoading(false);
        }
        return;
      }

      loader.load(
        candidateUrls[urlIndex],
        (gltf) => {
          if (isDisposed) return;

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

          root.updateMatrixWorld(true);

          // Auto-center and scale based on visible avatar mesh
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
              const scale = 1.35 / maxDim;
              root.scale.setScalar(scale);
              root.position.x = -center.x * scale;
              const yOffset = exerciseId === 'bicep-curl' ? 1.0 : 0.15;
              root.position.y = -center.y * scale + yOffset;
              root.position.z = -center.z * scale;
            }
          }

          scene.add(root);

          // Play looping exercise animation clip
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(root);
            if (exerciseId === 'bicep-curl') {
              const targetClipName = gender === 'female' ? 'BicepCurl_Female' : 'BicepCurl_Male';
              let targetClip = gltf.animations.find((c) => c.name === targetClipName);
              if (!targetClip) {
                targetClip = gltf.animations.find((c) =>
                  gender === 'female'
                    ? c.name.toLowerCase().includes('female') || c.name.includes('Armature|')
                    : c.name.toLowerCase().includes('male') || c.name.includes('001')
                ) || gltf.animations[0];
              }
              if (targetClip) {
                const action = mixer.clipAction(targetClip);
                action.setLoop(THREE.LoopRepeat);
                action.play();
              }
            } else {
              gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.setLoop(THREE.LoopRepeat);
                action.play();
              });
            }
          }

          setLoading(false);
        },
        undefined,
        (err) => {
          console.warn(`Failed loading ${candidateUrls[urlIndex]}:`, err);
          loadModel(urlIndex + 1);
        }
      );
    };

    loadModel(0);

    // 6. Animation loop
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      if (mixer) {
        mixer.update(delta);
      }
      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize handling
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 110;
      const h = container.clientHeight || 110;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      isDisposed = true;
      if (animId) cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.dispose();

      if (mixer) mixer.stopAllAction();

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gender, exerciseId]);

  return (
    <div
      ref={containerRef}
      className={`avatar-canvas-container ${className}`}
      aria-label={`3D ${exerciseId} Avatar Animation`}
    >
      {loading && !loadError && (
        <div className="avatar-canvas-loading">
          <div className="avatar-canvas-spinner" />
        </div>
      )}
    </div>
  );
}
