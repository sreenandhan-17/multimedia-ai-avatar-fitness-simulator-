import { useState } from 'react';
import { Link } from 'react-router-dom';
import PostureFigure from './PostureFigure';
import AvatarCanvas from './AvatarCanvas';
import './ExerciseCard.css';

// Shows the exercise's 3D avatar clip, or the posture stick figure if there is no clip
// or the 3D model cannot be loaded.
export default function ExerciseCard({ exercise }) {
  const [show3D, setShow3D] = useState(Boolean(exercise.avatarClip));

  return (
    <Link
      to={`/workout/${exercise.id}`}
      className={`exercise-card ${show3D ? 'exercise-card-3d' : ''}`}
    >
      {show3D ? (
        <AvatarCanvas exerciseId={exercise.id} onFallback={() => setShow3D(false)} />
      ) : (
        <PostureFigure posture={exercise.posture} />
      )}
      <span className="exercise-card-name">{exercise.name}</span>
    </Link>
  );
}
