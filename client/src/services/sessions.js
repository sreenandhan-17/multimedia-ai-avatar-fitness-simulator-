// Stores finished workout sessions in localStorage. Firebase replaces this later (issue #13),
// so every function keeps the same name and return shape.

const STORAGE_KEY = "fas_sessions";

const SAMPLE_EXERCISE_IDS = ["squat", "bicep_curl", "pushup", "lunge", "plank", "shoulder_press"];
const SAMPLE_MISTAKES = ["Go lower", "Slow down", "Keep back straight", "Full range of motion"];

// Reads the raw session list from localStorage. Never throws: bad or missing data becomes [].
function readSessionsFromStorage() {
  let rawValue = null;
  try {
    rawValue = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return [];
  }

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
}

// Writes the full session list to localStorage.
function writeSessionsToStorage(sessions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    // Storage full or unavailable: fail quietly, nothing we can do in the browser.
  }
}

// Saves one finished workout session, newest sessions are kept first.
export async function saveSession(session) {
  const sessions = readSessionsFromStorage();
  sessions.unshift(session);
  writeSessionsToStorage(sessions);
}

// Returns every saved session, newest first.
export async function getSessions() {
  const sessions = readSessionsFromStorage();
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  return sessions;
}

// Returns sessions from the last `days` days. Pass null for all time.
export async function getSessionsSince(days) {
  const sessions = await getSessions();

  if (days === null || days === undefined) {
    return sessions;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentSessions = [];
  for (let i = 0; i < sessions.length; i++) {
    const sessionDate = new Date(sessions[i].date);
    if (sessionDate >= cutoff) {
      recentSessions.push(sessions[i]);
    }
  }
  return recentSessions;
}

// Dev only: fills localStorage with about 10 made-up sessions over the last 14 days,
// so the dashboard has something to show before real workouts exist.
export async function addSampleSessions() {
  const sampleSessions = [];
  const sampleCount = 10;

  for (let i = 0; i < sampleCount; i++) {
    const daysAgo = Math.floor((i / sampleCount) * 14);
    const sessionDate = new Date();
    sessionDate.setDate(sessionDate.getDate() - daysAgo);

    const exerciseId = SAMPLE_EXERCISE_IDS[i % SAMPLE_EXERCISE_IDS.length];
    const mistakeName = SAMPLE_MISTAKES[i % SAMPLE_MISTAKES.length];

    sampleSessions.push({
      id: String(sessionDate.getTime()),
      date: sessionDate.toISOString(),
      exerciseId: exerciseId,
      sets: 3,
      reps: 30 + (i % 4) * 5,
      accuracy: 70 + (i % 6) * 5,
      avgTempo: 2.4 + (i % 5) * 0.2,
      durationSeconds: 420 + (i % 5) * 30,
      mistakes: { [mistakeName]: 1 + (i % 3) },
    });
  }

  const existingSessions = readSessionsFromStorage();
  writeSessionsToStorage(sampleSessions.concat(existingSessions));
}

// Deletes every saved session.
export async function clearSessions() {
  writeSessionsToStorage([]);
}
