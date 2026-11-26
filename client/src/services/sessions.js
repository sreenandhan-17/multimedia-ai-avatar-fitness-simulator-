// Stores finished workout sessions. Logged-in users get Firestore (users/{uid}/sessions/{id}),
// so their sessions follow them to any device. When nobody is logged in, or Firestore cannot
// be reached, everything falls back to localStorage. The two stores are never merged.
// Every function keeps the same name and return shape as the first localStorage version.

import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";

const STORAGE_KEY = "fas_sessions";
const SAMPLE_ID_PREFIX = "sample-";

// Firestore calls can hang forever while offline, so we give up after this long.
const FIRESTORE_TIMEOUT_MS = 8000;
// A Firestore batch allows 500 operations, we stay well below that.
const BATCH_SIZE = 400;

const SAMPLE_EXERCISE_IDS = ["squat", "bicep-curl", "push-up", "lunge", "plank", "shoulder-press"];
const SAMPLE_MISTAKES = ["Go lower", "Slow down", "Keep back straight", "Full range of motion"];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// True only for a plain session object. Anything else would be dropped on the next read.
function isSessionObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Turns a session's date into a number. A missing or invalid date becomes 0,
// so it sorts last instead of giving NaN and a random order.
function getSessionTime(session) {
  const time = new Date(session.date).getTime();
  if (Number.isNaN(time)) {
    return 0;
  }
  return time;
}

// Sorts newest first, in place.
function sortNewestFirst(sessions) {
  sessions.sort((a, b) => getSessionTime(b) - getSessionTime(a));
  return sessions;
}

// ---------------------------------------------------------------------------
// localStorage (used when logged out, offline or when Firestore fails)
// ---------------------------------------------------------------------------

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

    // Keep only real objects. A stray null or number would crash the sort and sample code.
    const validSessions = [];
    for (let i = 0; i < parsed.length; i++) {
      if (isSessionObject(parsed[i])) {
        validSessions.push(parsed[i]);
      }
    }
    return validSessions;
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

function saveSessionLocally(session) {
  const sessions = readSessionsFromStorage();
  sessions.unshift(session);
  writeSessionsToStorage(sessions);
}

function getSessionsLocally() {
  return sortNewestFirst(readSessionsFromStorage());
}

// Keeps real sessions, drops samples from an earlier call so the data is not doubled.
function replaceSamplesLocally(sampleSessions) {
  const realSessions = [];
  const existingSessions = readSessionsFromStorage();
  for (let i = 0; i < existingSessions.length; i++) {
    const existingId = String(existingSessions[i].id);
    if (!existingId.startsWith(SAMPLE_ID_PREFIX)) {
      realSessions.push(existingSessions[i]);
    }
  }
  writeSessionsToStorage(sampleSessions.concat(realSessions));
}

function clearSessionsLocally() {
  writeSessionsToStorage([]);
}

// ---------------------------------------------------------------------------
// Firestore (used for a logged-in user)
// ---------------------------------------------------------------------------

// Rejects if the promise takes too long, so a lost connection cannot freeze the app.
function withTimeout(promise) {
  let timerId = null;
  const timeoutPromise = new Promise((resolve, reject) => {
    timerId = setTimeout(() => {
      reject(new Error("Firestore did not answer in time"));
    }, FIRESTORE_TIMEOUT_MS);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
}

// Returns the uid of the logged-in user, or null when we should use localStorage instead.
async function getActiveUid() {
  if (!auth || !db) {
    return null; // No .env, Firebase never started.
  }
  if (navigator.onLine === false) {
    return null; // Offline: do not queue Firestore writes that would show up later.
  }

  // Wait until Firebase has checked the saved login. Reading currentUser too early
  // would look like "logged out" and quietly use localStorage after every refresh.
  try {
    await withTimeout(auth.authStateReady());
  } catch {
    return null;
  }

  if (!auth.currentUser) {
    return null;
  }
  return auth.currentUser.uid;
}

// users/{uid}/sessions
function getSessionsCollection(uid) {
  return collection(db, "users", uid, "sessions");
}

// Firestore document ids cannot contain "/".
function makeDocumentId(session) {
  let id = String(Date.now());
  if (session.id !== undefined && session.id !== null && String(session.id) !== "") {
    id = String(session.id);
  }
  return id.replace(/\//g, "_");
}

// Firestore rejects undefined values. A JSON round trip drops them and turns Dates into text.
function toPlainSession(session, id) {
  const plainSession = JSON.parse(JSON.stringify(session));
  plainSession.id = id;
  return plainSession;
}

async function saveSessionToFirestore(uid, session) {
  const id = makeDocumentId(session);
  const batch = writeBatch(db);
  batch.set(doc(getSessionsCollection(uid), id), toPlainSession(session, id));
  await batch.commit();
}

async function getSessionsFromFirestore(uid) {
  const snapshot = await getDocs(getSessionsCollection(uid));
  const sessions = [];
  snapshot.forEach((document) => {
    sessions.push(document.data());
  });
  return sortNewestFirst(sessions);
}

// Deletes documents in small batches. If onlySamples is true, real sessions are kept.
// Returns nothing, the caller can add new documents afterwards.
async function deleteSessionsFromFirestore(uid, onlySamples) {
  const snapshot = await getDocs(getSessionsCollection(uid));
  const documentsToDelete = [];
  snapshot.forEach((document) => {
    if (!onlySamples || document.id.startsWith(SAMPLE_ID_PREFIX)) {
      documentsToDelete.push(document.ref);
    }
  });

  for (let start = 0; start < documentsToDelete.length; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = documentsToDelete.slice(start, start + BATCH_SIZE);
    for (let i = 0; i < chunk.length; i++) {
      batch.delete(chunk[i]);
    }
    await batch.commit();
  }
}

async function replaceSamplesInFirestore(uid, sampleSessions) {
  await deleteSessionsFromFirestore(uid, true);

  const batch = writeBatch(db);
  for (let i = 0; i < sampleSessions.length; i++) {
    const id = makeDocumentId(sampleSessions[i]);
    batch.set(doc(getSessionsCollection(uid), id), toPlainSession(sampleSessions[i], id));
  }
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Choosing the store
// ---------------------------------------------------------------------------

// Runs the Firestore version for a logged-in user. If nobody is logged in, or Firestore
// fails (offline, rules, timeout), runs the localStorage version instead.
async function runWithFallback(firestoreAction, localAction) {
  const uid = await getActiveUid();

  if (uid) {
    try {
      return await withTimeout(firestoreAction(uid));
    } catch (error) {
      console.warn("Firestore failed, using localStorage instead:", error);
    }
  }

  return localAction();
}

// ---------------------------------------------------------------------------
// Public functions (same names and shapes as the first version)
// ---------------------------------------------------------------------------

// Saves one finished workout session.
export async function saveSession(session) {
  // Ignore anything that is not a session object, it would be dropped on the next read anyway.
  if (!isSessionObject(session)) {
    return;
  }

  await runWithFallback(
    (uid) => saveSessionToFirestore(uid, session),
    () => saveSessionLocally(session),
  );
}

// Returns every saved session, newest first.
export async function getSessions() {
  return runWithFallback(
    (uid) => getSessionsFromFirestore(uid),
    () => getSessionsLocally(),
  );
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

// Dev only: fills the store with about 10 made-up sessions over the last 14 days,
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

    // Round to one decimal so we get 2.8 and not 2.8000000000000003.
    const avgTempo = Math.round((2.4 + (i % 5) * 0.2) * 10) / 10;

    sampleSessions.push({
      // The "sample-" prefix lets us find and replace old samples, and "-i" keeps ids unique.
      id: SAMPLE_ID_PREFIX + sessionDate.getTime() + "-" + i,
      date: sessionDate.toISOString(),
      exerciseId: exerciseId,
      sets: 3,
      reps: 30 + (i % 4) * 5,
      accuracy: 70 + (i % 6) * 5,
      avgTempo: avgTempo,
      durationSeconds: 420 + (i % 5) * 30,
      mistakes: { [mistakeName]: 1 + (i % 3) },
    });
  }

  await runWithFallback(
    (uid) => replaceSamplesInFirestore(uid, sampleSessions),
    () => replaceSamplesLocally(sampleSessions),
  );
}

// Deletes every saved session in the store that is in use.
export async function clearSessions() {
  await runWithFallback(
    (uid) => deleteSessionsFromFirestore(uid, false),
    () => clearSessionsLocally(),
  );
}
