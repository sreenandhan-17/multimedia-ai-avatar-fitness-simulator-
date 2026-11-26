import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import IntroGate from './pages/IntroGate';
import LoginPage from './pages/LoginPage';
import TutorialPage from './pages/TutorialPage';
import SplitPage from './pages/SplitPage';
import ExerciseListPage from './pages/ExerciseListPage';
import WorkoutPage from './pages/WorkoutPage';
import DashboardPage from './pages/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Routes>
      <Route path="/" element={<HomePage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/login" element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/intro" element={<IntroGate theme={theme} toggleTheme={toggleTheme} />} />
      <Route
        path="/tutorial"
        element={
          <ProtectedRoute>
            <TutorialPage theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/split"
        element={
          <ProtectedRoute>
            <SplitPage theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/split/:dayId"
        element={
          <ProtectedRoute>
            <ExerciseListPage theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workout/:exerciseId"
        element={
          <ProtectedRoute>
            <WorkoutPage theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
