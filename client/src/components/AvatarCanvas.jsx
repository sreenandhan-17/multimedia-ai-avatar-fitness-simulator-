import { useEffect, useRef, useState } from 'react';
import { createAvatarViewer, getAvatarSettings } from './avatarViewer';
import './AvatarCanvas.css';

// Small looping 3D avatar for an exercise card. Not draggable, so the whole card stays a link.
// Calls onFallback() if the clip is missing or the model fails to load.
export default function AvatarCanvas({ exerciseId, className = '', onFallback }) {
  const stageRef = useRef(null);
  const onFallbackRef = useRef(onFallback);
  const [readyKey, setReadyKey] = useState(null);

  // Gender chosen on the workout page
  const [gender] = useState(() => localStorage.getItem('fitness-avatar-gender') || 'female');

  const settings = getAvatarSettings(exerciseId);
  const clip = settings ? settings.clip : null;
  const view = settings ? settings.view : 'side';
  const viewerKey = clip ? `${clip}:${view}:${gender}` : null;

  useEffect(() => {
    onFallbackRef.current = onFallback;
  }, [onFallback]);

  useEffect(() => {
    if (!viewerKey || !stageRef.current) {
      if (onFallbackRef.current) onFallbackRef.current();
      return undefined;
    }

    // With reduced motion the card shows one still pose instead of a loop
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const viewer = createAvatarViewer({
      container: stageRef.current,
      clipName: clip,
      view,
      gender,
      playing: !reducedMotion,
      interactive: false,
      canvasClassName: 'avatar-canvas-element',
      onReady: () => setReadyKey(viewerKey),
      onError: (error) => {
        console.warn(`3D avatar unavailable for ${exerciseId}:`, error);
        if (onFallbackRef.current) onFallbackRef.current();
      },
    });

    return () => viewer.dispose();
  }, [viewerKey, clip, view, gender, exerciseId]);

  return (
    <div
      ref={stageRef}
      className={`avatar-canvas-container ${className}`}
      aria-label={`3D ${exerciseId} avatar animation`}
    >
      {readyKey !== viewerKey && (
        <div className="avatar-canvas-loading">
          <div className="avatar-canvas-spinner" />
        </div>
      )}
    </div>
  );
}
