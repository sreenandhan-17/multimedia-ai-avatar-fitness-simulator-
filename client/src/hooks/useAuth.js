import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Returns { user, loading }. user is null when logged out.
export function useAuth() {
  return useContext(AuthContext);
}
