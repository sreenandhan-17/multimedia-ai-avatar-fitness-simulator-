import { toLocalDayKey } from '../utils/dateKeys';
import './StreakCalendar.css';

const MAX_GRID_DAYS = 30;

// Builds the set of calendar days (YYYY-MM-DD) that have at least one session.
function getActiveDayKeys(sessions) {
  const activeDays = new Set();
  for (let i = 0; i < sessions.length; i++) {
    activeDays.add(toLocalDayKey(new Date(sessions[i].date)));
  }
  return activeDays;
}

// Counts consecutive active days counting back from today. A session today
// is not required to keep the streak alive (the user may not have trained
// yet today), so the count starts from yesterday if today is empty.
function getCurrentStreak(activeDayKeys) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let cursor = new Date(today);
  if (!activeDayKeys.has(toLocalDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (activeDayKeys.has(toLocalDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// `streakSessions` should be every saved session (not filtered by the time
// range) so picking "7 days" in the filter can't cap the streak count.
export default function StreakCalendar({ sessions, streakSessions, rangeDays }) {
  const gridDays = rangeDays ? Math.min(rangeDays, MAX_GRID_DAYS) : MAX_GRID_DAYS;
  const activeDayKeys = getActiveDayKeys(sessions);
  const streak = getCurrentStreak(getActiveDayKeys(streakSessions || sessions));

  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = gridDays - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = toLocalDayKey(date);
    days.push({ key, dayOfMonth: date.getDate(), active: activeDayKeys.has(key) });
  }

  return (
    <div className="streak-calendar-card">
      <div className="streak-calendar-header">
        <h2 className="streak-calendar-title">Streak</h2>
        <span className="streak-calendar-count">
          {streak} day{streak === 1 ? '' : 's'}
        </span>
      </div>

      <div className="streak-calendar-grid">
        {days.map((day) => (
          <div
            key={day.key}
            className={`streak-day-cell ${day.active ? 'active' : ''}`}
            title={day.key}
          >
            {day.dayOfMonth}
          </div>
        ))}
      </div>
    </div>
  );
}
