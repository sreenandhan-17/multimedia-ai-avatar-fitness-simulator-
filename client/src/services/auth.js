// Small wrappers around Firebase Auth so the React components stay simple.
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

// Creates the account and saves the name the user typed.
export async function signUp(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(result.user, { displayName: name.trim() });
  return result.user;
}

export async function signIn(email, password) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user;
}

// Opens the Google popup. Must be called straight from a click, or browsers block it.
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

// Firebase sends the reset email itself.
export async function sendResetEmail(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

// Turns a Firebase error into a sentence a user can understand.
// Returns '' when the user just closed the Google popup, because that is not an error.
export function getAuthErrorMessage(error) {
  const code = error && error.code ? error.code : '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return '';
  }

  const messages = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/invalid-login-credentials': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'auth/popup-blocked': 'The Google window was blocked. Allow pop-ups for this site and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not turned on in Firebase yet.',
    'auth/unauthorized-domain': 'This website address is not allowed in Firebase yet.',
  };

  if (messages[code]) {
    return messages[code];
  }
  return 'Something went wrong. Please try again.';
}
