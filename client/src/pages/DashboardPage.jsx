import TopBar from '../components/TopBar';
import './DashboardPage.css';

export default function DashboardPage({ theme, toggleTheme }) {
  return (
    <div className="dashboard-page">
      <TopBar theme={theme} toggleTheme={toggleTheme} />
      <main className="dashboard-container">
        <h1 className="dashboard-title">Dashboard</h1>
      </main>
    </div>
  );
}
