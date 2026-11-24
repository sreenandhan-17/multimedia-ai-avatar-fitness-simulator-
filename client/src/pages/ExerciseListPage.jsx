import { Link, Navigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import ExerciseCard from '../components/ExerciseCard';
import Icon from '../components/Icon';
import exerciseData from '../data/exercises.json';
import './ExerciseListPage.css';

export default function ExerciseListPage({ theme, toggleTheme }) {
  const { dayId } = useParams();
  const day = exerciseData.days.find((candidate) => candidate.id === dayId);

  if (!day) {
    return <Navigate to="/split" replace />;
  }

  return (
    <div className="exercise-list-page">
      <TopBar theme={theme} toggleTheme={toggleTheme} />

      <div className="exercise-list-body">
        <div className="exercise-list-back-row">
          <Link to="/split" className="btn-secondary btn-md">
            <Icon name="arrow-left" size={18} />
            <span>Back</span>
          </Link>
        </div>

        <h1 className="exercise-list-title">{day.title}</h1>

        {day.bodyParts.map((bodyPart) => {
          const exercises = exerciseData.exercises.filter(
            (exercise) => exercise.day === day.id && exercise.bodyPart === bodyPart,
          );

          return (
            <section key={bodyPart} className="exercise-section">
              <h2 className="exercise-section-title">{bodyPart}</h2>
              <div className="exercise-section-grid">
                {exercises.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
