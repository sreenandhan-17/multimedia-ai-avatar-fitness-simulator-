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

// Sums mistake counts across all sessions, grouped by exercise, then
// flattens to a single list sorted by count so the worst habits show first.
function getTopMistakes(sessions, limit) {
  const countsByExerciseAndMistake = {};
  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const mistakeNames = Object.keys(session.mistakes || {});
    for (let j = 0; j < mistakeNames.length; j++) {
      const mistakeName = mistakeNames[j];
      const key = session.exerciseId + '::' + mistakeName;
      const count = session.mistakes[mistakeName];
      countsByExerciseAndMistake[key] = (countsByExerciseAndMistake[key] || 0) + count;
    }
  }

  const rows = [];
  const keys = Object.keys(countsByExerciseAndMistake);
  for (let i = 0; i < keys.length; i++) {
    const [exerciseId, mistakeName] = keys[i].split('::');
    rows.push({
      exerciseId,
      exerciseName: getExerciseName(exerciseId),
      mistakeName,
      count: countsByExerciseAndMistake[keys[i]],
    });
  }

  rows.sort((a, b) => b.count - a.count);
  return rows.slice(0, limit);
}

// Returns the mistake with the highest count in one session's mistake map,
// or null if that session has none.
function getTopMistakeName(mistakes) {
  const mistakeNames = Object.keys(mistakes || {});
  if (mistakeNames.length === 0) {
    return null;
  }

  let topName = mistakeNames[0];
  for (let i = 1; i < mistakeNames.length; i++) {
    if (mistakes[mistakeNames[i]] > mistakes[topName]) {
      topName = mistakeNames[i];
    }
  }
  return topName;
}

// Rule-based suggestion for the next session, based on the most recent one.
// Accuracy rules take priority over the tempo rule, per the issue spec.
function getNextSessionSuggestion(sessions) {
  if (sessions.length === 0) {
    return null;
  }

  const latest = sessions[0];
  const exerciseName = getExerciseName(latest.exerciseId);

  if (latest.accuracy >= 85) {
    return `Great form on ${exerciseName} (${latest.accuracy}% accuracy). Try adding a few reps or an extra set next time.`;
  }

  if (latest.accuracy < 70) {
    const topMistake = getTopMistakeName(latest.mistakes);
    const mistakeText = topMistake ? ` Focus on: "${topMistake}".` : '';
    return `Accuracy on ${exerciseName} was ${latest.accuracy}%. Try fewer reps next time and focus on form.${mistakeText}`;
  }

  if (latest.avgTempo < 2.5) {
    return `Your tempo on ${exerciseName} averaged ${latest.avgTempo}s per rep, a bit fast. Slow down to about 3 seconds per rep.`;
  }

  return `Solid session on ${exerciseName}. Keep up the same pace and form next time.`;
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
  const topMistakes = getTopMistakes(sessions, 5);
  const suggestion = getNextSessionSuggestion(sessions);

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

        {!loading && sessions.length > 0 && (
          <div className="dashboard-bottom-row">
            <div className="dashboard-mistakes-card">
              <h2 className="dashboard-card-title">Common mistakes</h2>
              {topMistakes.length === 0 ? (
                <p className="dashboard-status-text">No mistakes logged. Keep it up!</p>
              ) : (
                <ul className="dashboard-mistakes-list">
                  {topMistakes.map((row) => (
                    <li key={row.exerciseId + row.mistakeName} className="dashboard-mistake-row">
                      <span className="dashboard-mistake-text">
                        {row.exerciseName}: {row.mistakeName}
                      </span>
                      <span className="dashboard-mistake-count">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dashboard-suggestion-card">
              <h2 className="dashboard-card-title">Next session</h2>
              <p className="dashboard-suggestion-text">{suggestion}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
