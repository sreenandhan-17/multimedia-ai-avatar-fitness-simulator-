import { Link } from 'react-router-dom';
import PostureFigure from './PostureFigure';
import AvatarCanvas from './AvatarCanvas';
import './ExerciseCard.css';

// Displays either the interactive 3D humanoid avatar canvas (for Push-up & Bicep curl)
// or the posture figure for other exercises.
export default function ExerciseCard({ exercise }) {
  const is3D = exercise.id === 'push-up' || exercise.id === 'bicep-curl';

  return (
    <Link
      to={`/workout/${exercise.id}`}
      className={`exercise-card ${is3D ? 'exercise-card-3d' : ''}`}
    >
      {is3D ? (
        <AvatarCanvas exerciseId={exercise.id} />
      ) : (
        <PostureFigure posture={exercise.posture} />
      )}
      <span className="exercise-card-name">{exercise.name}</span>
    </Link>
  );
}
