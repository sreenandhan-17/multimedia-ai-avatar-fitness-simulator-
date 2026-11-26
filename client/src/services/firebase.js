// Sets up Firebase once for the whole app. The values come from client/.env
// (see client/.env.example), never from the code, so keys stay out of Git.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// True when the .env file is filled in. The login screen uses this to show a clear message.
export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Without a filled-in .env, Firebase throws on start-up and the page goes blank.
// So we only start it when the keys exist. Otherwise auth and db stay null.
let app = null;
if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
