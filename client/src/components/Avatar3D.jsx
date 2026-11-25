import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { createAvatarViewer, getAvatarSettings } from './avatarViewer';
import './Avatar3D.css';

// Interactive 3D demo of an exercise for the workout page. Plays the exercise's clip from
// avatar.glb, and falls back to the SVG avatar when there is no clip or the model fails to load.
export default function Avatar3D({ exercise = 'squat', gender = 'female', playing = true, speed = 1 }) {
  const stageRef = useRef(null);
  const viewerRef = useRef(null);
  const playbackRef = useRef({ playing, speed });

  const settings = getAvatarSettings(exercise);
  const clip = settings ? settings.clip : null;
  const view = settings ? settings.view : 'side';
  const viewerKey = clip ? `${clip}:${view}:${gender}` : null;

  // Result of the last viewer we created; ignored once the exercise or gender changes
  const [result, setResult] = useState({ key: null, status: 'loading' });
  let status = 'loading';
  if (!viewerKey) {
    status = 'fallback';
  } else if (result.key === viewerKey) {
    status = result.status;
  }

  // Play/pause and speed change the running viewer instead of rebuilding it
  useEffect(() => {
    playbackRef.current = { playing, speed };
    if (viewerRef.current) {
      viewerRef.current.setPlaying(playing);
      viewerRef.current.setSpeed(speed);
    }
  }, [playing, speed]);

  useEffect(() => {
    if (!viewerKey || !stageRef.current) return undefined;

    const viewer = createAvatarViewer({
      container: stageRef.current,
      clipName: clip,
      view,
      gender,
      playing: playbackRef.current.playing,
      speed: playbackRef.current.speed,
      interactive: true,
      canvasClassName: 'avatar-3d-canvas',
      onReady: () => setResult({ key: viewerKey, status: 'ready' }),
      onError: (error) => {
        console.warn('3D avatar unavailable, showing the SVG avatar instead:', error);
        setResult({ key: viewerKey, status: 'fallback' });
      },
    });
    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [viewerKey, clip, view, gender]);

  return (
    <div className="avatar-3d-container">
      {status === 'fallback' ? (
        <div className="avatar-3d-fallback">
          <Avatar exercise={exercise} gender={gender} size="large" playing={playing} speed={speed} />
        </div>
      ) : (
        <div className="avatar-3d-stage" ref={stageRef} />
      )}

      {status === 'loading' && (
        <div className="avatar-3d-loading">
          <div className="avatar-3d-spinner" />
          <span>Loading {gender === 'female' ? 'Female' : 'Male'} Avatar...</span>
        </div>
      )}

      {status === 'ready' && <div className="avatar-3d-overlay-hint">🖱 Drag to rotate 360°</div>}
    </div>
  );
}
