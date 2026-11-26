import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AuthContext } from '../context/AuthContext';

// Listens to Firebase once and shares the logged-in user with every page.
// "loading" stays true until Firebase has checked the saved login, so a refresh
// does not bounce a logged-in user to the login page.
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) {
      return undefined;
    }

    const stopListening = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return stopListening;
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
