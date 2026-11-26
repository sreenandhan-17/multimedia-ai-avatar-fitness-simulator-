import { createContext } from 'react';

// Holds { user, loading } for the whole app. Filled in by AuthProvider.
export const AuthContext = createContext({ user: null, loading: true });
