// Stores finished workout sessions.
//
// Logged-in users: sessions go to Firestore (users/{uid}/sessions/{id}) and follow the user
// to any device. If a save fails (offline, timeout, error) the session waits in a pending
// queue in localStorage ("fas_pending_sessions") and is uploaded again as soon as possible.
// Until then it is still shown, so a finished workout is never lost.
//
// Logged-out users (or no .env): sessions stay in localStorage ("fas_sessions") and are
// never uploaded or merged into an account.
//
// Every function keeps the same name and return shape as the first localStorage version.

import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";

const STORAGE_KEY = "fas_sessions";
const PENDING_KEY = "fas_pending_sessions";
const SAMPLE_ID_PREFIX = "sample-";

// Firestore calls can hang forever while offline, so we give up after this long.
const FIRESTORE_TIMEOUT_MS = 8000;
// A Firestore batch allows 500 operations, we stay well below that.
const BATCH_SIZE = 400;

// The only fields a session may have. firestore.rules rejects any other field.
const SESSION_KEYS = [
  "id",
  "date",
  "exerciseId",
  "sets",
  "reps",
  "accuracy",
  "avgTempo",
  "durationSeconds",
  "mistakes",
];

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

// False only when the browser says it is offline.
function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

// Makes a new unique id. randomUUID needs a secure page (https or localhost),
// so there is a fallback for other cases.
function createRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

// Returns an id that Firestore accepts as a document id. A missing id gets a new one.
function makeValidSessionId(id) {
  let text = "";
  if (id !== undefined && id !== null) {
    text = String(id);
  }
  if (text === "") {
    text = createRandomId();
  }

  // Document ids cannot contain "/", cannot be "." or "..", and cannot look like "__name__".
  text = text.replace(/\//g, "_");
  if (text === "." || text === ".." || /^__.*__$/.test(text)) {
    text = "s" + text;
  }
  return text;
}

// Makes a clean copy of a session that is safe to store in Firestore and in the pending queue:
// only the allowed fields, no undefined values, and always a valid id.
// The same id is then used for the Firestore document and the pending entry, so a retry
// overwrites the same document and can never create a second copy.
function prepareSession(session) {
  const plainSession = JSON.parse(JSON.stringify(session));

  const cleanSession = {};
  for (let i = 0; i < SESSION_KEYS.length; i++) {
    const key = SESSION_KEYS[i];
    if (plainSession[key] !== undefined) {
      cleanSession[key] = plainSession[key];
    }
  }
  cleanSession.id = makeValidSessionId(plainSession.id);
  return cleanSession;
}

// ---------------------------------------------------------------------------
// localStorage for logged-out users
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
// Pending queue for logged-in users: [{ uid, session, failedAt }]
// ---------------------------------------------------------------------------

// Reads the whole queue. Never throws: bad or missing data becomes [].
function readPendingEntries() {
  let rawValue = null;
  try {
    rawValue = window.localStorage.getItem(PENDING_KEY);
  } catch {
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

    const validEntries = [];
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i];
      if (isSessionObject(entry) && typeof entry.uid === "string" && isSessionObject(entry.session)) {
        validEntries.push(entry);
      }
    }
    return validEntries;
  } catch {
    return [];
  }
}

function writePendingEntries(entries) {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable: nothing we can do in the browser.
  }
}

// Adds a session to the queue. An older entry with the same uid and id is replaced, never doubled.
function addPendingSession(uid, session) {
  const entries = readPendingEntries();
  const keptEntries = [];
  for (let i = 0; i < entries.length; i++) {
    const isSameSession = entries[i].uid === uid && entries[i].session.id === session.id;
    if (!isSameSession) {
      keptEntries.push(entries[i]);
    }
  }
  keptEntries.push({ uid: uid, session: session, failedAt: new Date().toISOString() });
  writePendingEntries(keptEntries);
}

// Removes one entry. We read the queue again right before writing, so changes made
// by another tab in the meantime are not lost. Entries of other users are never touched.
function removePendingSession(uid, sessionId) {
  const entries = readPendingEntries();
  const keptEntries = [];
  for (let i = 0; i < entries.length; i++) {
    const isThisSession = entries[i].uid === uid && entries[i].session.id === sessionId;
    if (!isThisSession) {
      keptEntries.push(entries[i]);
    }
  }
  writePendingEntries(keptEntries);
}

// Removes every pending entry of one user (used by clearSessions).
function removeAllPendingSessions(uid) {
  const entries = readPendingEntries();
  const keptEntries = [];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].uid !== uid) {
      keptEntries.push(entries[i]);
    }
  }
  writePendingEntries(keptEntries);
}

// The sessions of one user that are still waiting to be uploaded.
function getPendingSessions(uid) {
  const entries = readPendingEntries();
  const sessions = [];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].uid === uid) {
      sessions.push(entries[i].session);
    }
  }
  return sessions;
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

// Returns the uid of the logged-in user, or null when nobody is logged in (or no .env).
// Being offline does not matter here: Firebase restores the login from the browser.
async function getCurrentUid() {
  if (!auth || !db) {
    return null;
  }

  // Wait until Firebase has checked the saved login. Reading currentUser too early
  // would look like "logged out" after every refresh.
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

// Writes one session. setDoc with the session id means a retry overwrites the same
// document instead of creating a second one.
async function saveSessionToFirestore(uid, session) {
  await setDoc(doc(getSessionsCollection(uid), session.id), session);
}

async function getSessionsFromFirestore(uid) {
  const snapshot = await getDocs(getSessionsCollection(uid));
  const sessions = [];
  snapshot.forEach((document) => {
    sessions.push(document.data());
  });
  return sessions;
}

// Deletes documents in small batches. If onlySamples is true, real sessions are kept.
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
    const session = prepareSession(sampleSessions[i]);
    batch.set(doc(getSessionsCollection(uid), session.id), session);
  }
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Uploading the pending queue
// ---------------------------------------------------------------------------

// One upload per user at a time. A second call while one is running gets the same promise.
const syncsInFlight = {};

// Uploads this user's pending sessions. Returns true when there was no connection problem.
// Never throws. An entry leaves the queue only after its write succeeded.
function syncPendingSessions(uid) {
  if (syncsInFlight[uid]) {
    return syncsInFlight[uid];
  }

  const syncPromise = uploadPendingSessions(uid).finally(() => {
    delete syncsInFlight[uid];
  });
  syncsInFlight[uid] = syncPromise;
  return syncPromise;
}

async function uploadPendingSessions(uid) {
  const pendingSessions = getPendingSessions(uid);
  if (pendingSessions.length === 0) {
    return true;
  }
  if (!db || !isOnline()) {
    return false;
  }

  for (let i = 0; i < pendingSessions.length; i++) {
    const session = pendingSessions[i];
    try {
      await withTimeout(saveSessionToFirestore(uid, session));
      removePendingSession(uid, session.id);
    } catch (error) {
      // A rejected session (rules) can never succeed, so remove it instead of retrying
      // forever. Anything else is most likely a connection problem: keep it queued and
      // stop here, so the remaining sessions get a turn on the next sync.
      const isRejected = error && (error.code === "permission-denied" || error.code === "invalid-argument");
      if (isRejected) {
        console.warn("Dropping a pending session the server will never accept:", error);
        removePendingSession(uid, session.id);
        continue;
      }

      console.warn("Could not upload a pending session yet:", error);
      return false;
    }
  }
  return true;
}

// Runs the upload for whoever is logged in right now.
async function syncForCurrentUser() {
  const uid = await getCurrentUid();
  if (uid) {
    await syncPendingSessions(uid);
  }
}

// Retries the queue when the browser comes back online and when someone logs in.
let autoSyncStarted = false;
function startAutoSync() {
  if (autoSyncStarted || !auth || typeof window === "undefined") {
    return;
  }
  autoSyncStarted = true;

  window.addEventListener("online", () => {
    syncForCurrentUser();
  });
  onAuthStateChanged(auth, (user) => {
    if (user) {
      syncPendingSessions(user.uid);
    }
  });
}
startAutoSync();

// ---------------------------------------------------------------------------
// Reading for a logged-in user
// ---------------------------------------------------------------------------

// Firestore sessions plus this user's pending ones, newest first.
// If the same id is in both, the Firestore copy wins.
function combineSessions(firestoreSessions, pendingSessions) {
  const sessionsById = new Map();
  for (let i = 0; i < pendingSessions.length; i++) {
    sessionsById.set(String(pendingSessions[i].id), pendingSessions[i]);
  }
  for (let i = 0; i < firestoreSessions.length; i++) {
    sessionsById.set(String(firestoreSessions[i].id), firestoreSessions[i]);
  }
  return sortNewestFirst(Array.from(sessionsById.values()));
}

async function getSessionsForUser(uid) {
  // Try to upload anything waiting first, so the read below already includes it.
  const connectionOk = await syncPendingSessions(uid);

  let firestoreSessions = [];
  if (connectionOk && isOnline()) {
    try {
      firestoreSessions = await withTimeout(getSessionsFromFirestore(uid));
    } catch (error) {
      // Read failed: still show this user's own unsaved sessions instead of crashing.
      console.warn("Could not read sessions from Firestore:", error);
    }
  }

  return combineSessions(firestoreSessions, getPendingSessions(uid));
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

  const uid = await getCurrentUid();
  if (!uid) {
    saveSessionLocally(session);
    return;
  }

  // The id is created here, before the first attempt, and reused for every retry.
  const preparedSession = prepareSession(session);
  try {
    if (!isOnline()) {
      throw new Error("The browser is offline");
    }
    await withTimeout(saveSessionToFirestore(uid, preparedSession));
  } catch (error) {
    console.warn("Could not save to Firestore, will retry later:", error);
    addPendingSession(uid, preparedSession);
  }
}

// Returns every saved session, newest first.
export async function getSessions() {
  const uid = await getCurrentUid();
  if (!uid) {
    return getSessionsLocally();
  }
  return getSessionsForUser(uid);
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

  const uid = await getCurrentUid();
  if (!uid) {
    replaceSamplesLocally(sampleSessions);
    return;
  }

  // Samples are only for demos, so if Firestore is not reachable we just skip them.
  try {
    if (!isOnline()) {
      throw new Error("The browser is offline");
    }
    await withTimeout(replaceSamplesInFirestore(uid, sampleSessions));
  } catch (error) {
    console.warn("Could not add sample sessions to Firestore:", error);
  }
}

// Deletes every saved session of whoever is using the app (logged in or not).
export async function clearSessions() {
  const uid = await getCurrentUid();
  if (!uid) {
    clearSessionsLocally();
    return;
  }

  // Clear the queue too, or the deleted sessions would come back from it.
  removeAllPendingSessions(uid);
  try {
    if (!isOnline()) {
      throw new Error("The browser is offline");
    }
    await withTimeout(deleteSessionsFromFirestore(uid, false));
  } catch (error) {
    console.warn("Could not clear sessions in Firestore:", error);
  }
}
