import { useState, useEffect, useCallback } from 'react';
import TopBar from '../components/TopBar';
import ProgressionChart from '../components/ProgressionChart';
import StreakCalendar from '../components/StreakCalendar';
import { getSessionsSince, addSampleSessions } from '../services/sessions';
import exercisesData from '../data/exercises.json';
import './DashboardPage.css';

const FILTERS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'All time', days: null },
];

// Looks up an exercise's display name from its id. Falls back to the raw id
// so a removed or renamed exercise still shows something readable.
function getExerciseName(exerciseId) {
  const exercise = exercisesData.exercises.find((e) => e.id === exerciseId);
  return exercise ? exercise.name : exerciseId;
}

export default function DashboardPage({ theme, toggleTheme }) {
  const [filterDays, setFilterDays] = useState(30);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const result = await getSessionsSince(filterDays);
    setSessions(result);
    setLoading(false);
  }, [filterDays]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleAddSampleSessions = async () => {
    await addSampleSessions();
    await loadSessions();
  };

  // Totals across the filtered sessions. All zero when there are none.
  let totalReps = 0;
  let totalSets = 0;
  let accuracySum = 0;
  for (let i = 0; i < sessions.length; i++) {
    totalReps += sessions[i].reps || 0;
    totalSets += sessions[i].sets || 0;
    accuracySum += sessions[i].accuracy || 0;
  }
  const averageAccuracy = sessions.length > 0 ? Math.round(accuracySum / sessions.length) : 0;

  return (
    <div className="dashboard-page">
      <TopBar theme={theme} toggleTheme={toggleTheme} />

      <main className="dashboard-container">
        <div className="dashboard-header-row">
          <h1 className="dashboard-title">Dashboard</h1>

          <div className="dashboard-filter-group" role="group" aria-label="Time range">
            {FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                className={`dashboard-filter-btn ${filterDays === filter.days ? 'active' : ''}`}
                onClick={() => setFilterDays(filter.days)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {import.meta.env.DEV && (
          <div className="dashboard-dev-row">
            <button type="button" className="dashboard-dev-btn" onClick={handleAddSampleSessions}>
              Add sample sessions (dev only)
            </button>
          </div>
        )}

        {loading && <p className="dashboard-status-text">Loading sessions...</p>}

        {!loading && sessions.length === 0 && (
          <p className="dashboard-status-text">
            No sessions yet. Finish a workout, or use "Add sample sessions" above to preview the
            dashboard.
          </p>
        )}

        {!loading && sessions.length > 0 && (
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-box">
              <span className="dashboard-stat-label">Total reps</span>
              <div className="dashboard-stat-val">{totalReps}</div>
            </div>
            <div className="dashboard-stat-box">
              <span className="dashboard-stat-label">Total sets</span>
              <div className="dashboard-stat-val">{totalSets}</div>
            </div>
            <div className="dashboard-stat-box">
              <span className="dashboard-stat-label">Average accuracy</span>
              <div className="dashboard-stat-val">{averageAccuracy}%</div>
            </div>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="dashboard-charts-row">
            <ProgressionChart sessions={sessions} />
            <StreakCalendar sessions={sessions} rangeDays={filterDays} />
          </div>
        )}
      </main>
    </div>
  );
}
