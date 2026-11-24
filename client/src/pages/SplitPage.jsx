import { Link, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Icon from '../components/Icon';
import exerciseData from '../data/exercises.json';
import './SplitPage.css';

export default function SplitPage({ theme, toggleTheme }) {
  const navigate = useNavigate();

  return (
    <div className="split-page">
      <TopBar theme={theme} toggleTheme={toggleTheme} />

      <div className="split-body">
        <h1 className="split-title">Weekly split</h1>

        <div className="split-grid-wrapper">
          <button
            type="button"
            className="split-back-button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            title="Go back"
          >
            <Icon name="arrow-left" size={18} />
            <span>Back</span>
          </button>

          <div className="split-day-grid">
            {exerciseData.days.map((day) => (
              <Link key={day.id} to={`/split/${day.id}`} className="split-day-card">
                <span className="split-day-title">{day.title}</span>
                <span className="split-day-divider" />

                {day.bodyParts.map((bodyPart) => {
                  const exerciseNames = exerciseData.exercises
                    .filter((exercise) => exercise.day === day.id && exercise.bodyPart === bodyPart)
                    .map((exercise) => exercise.name);

                  return (
                    <div key={bodyPart} className="split-day-part">
                      <span className="split-day-part-row">
                        <Icon name={bodyPart.toLowerCase()} size={24} />
                        <span>{bodyPart}</span>
                      </span>
                      <span className="split-day-exercises">{exerciseNames.join(', ')}</span>
                    </div>
                  );
                })}

                <span className="split-day-open primary-button btn-md" aria-hidden="true">
                  Open day
                </span>
              </Link>
            ))}
          </div>
        </div>

        <p className="split-rest-note">Rest and recover after Day 3.</p>
      </div>
    </div>
  );
}
