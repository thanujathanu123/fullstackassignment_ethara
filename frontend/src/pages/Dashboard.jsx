import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Gauge, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import { connectRealtime } from '../services/socket';

const statCards = [
  { key: 'total_tasks', label: 'Total tasks', icon: ClipboardList },
  { key: 'completed_tasks', label: 'Completed', icon: CheckCircle2 },
  { key: 'pending_tasks', label: 'Pending', icon: Clock3 },
  { key: 'overdue_tasks', label: 'Overdue', icon: AlertTriangle },
  { key: 'predicted_overdue_tasks', label: 'At risk', icon: TrendingUp },
  { key: 'productivity_score', label: 'Productivity score', icon: Gauge }
];

const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    overdue_tasks: 0,
    predicted_overdue_tasks: 0,
    productivity_score: 0
  });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      const [{ data: dashboardData }, { data: analyticsData }] = await Promise.all([
        api.get('/dashboard'),
        api.get('/analytics')
      ]);
      setStats(dashboardData.stats);
      setAnalytics(analyticsData.analytics);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const socket = connectRealtime(token);

    if (!socket) {
      return undefined;
    }

    socket.on('dashboard:update', loadDashboard);
    socket.on('project:event', loadDashboard);

    return () => {
      socket.off('dashboard:update', loadDashboard);
      socket.off('project:event', loadDashboard);
    };
  }, [token]);

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Dashboard</h1>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div className="screen-message">Loading dashboard...</div>
      ) : (
        <div className="stats-grid">
          {statCards.map(({ key, label, icon: Icon }) => (
            <article className="stat-card" key={key}>
              <div className="stat-icon">
                <Icon size={22} />
              </div>
              <span>{label}</span>
              <strong>{stats[key]}</strong>
            </article>
          ))}
        </div>
      )}

      {analytics && (
        <>
          <section className="analytics-grid">
            <article className="analytics-panel">
              <h2>Status breakdown</h2>
              <div className="metric-list">
                {analytics.status_breakdown.map((item) => (
                  <div className="metric-row" key={item.status}>
                    <span>{item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="analytics-panel">
              <h2>High-risk tasks</h2>
              <div className="metric-list">
                {analytics.high_risk_tasks.length === 0 ? (
                  <div className="muted-row">No high-risk tasks</div>
                ) : analytics.high_risk_tasks.map((task) => (
                  <div className="metric-row" key={task.id}>
                    <span>{task.title}</span>
                    <strong>{task.risk_score}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="analytics-panel">
            <h2>Project productivity</h2>
            <div className="project-analytics-table">
              {analytics.by_project.length === 0 ? (
                <div className="muted-row">No project data yet</div>
              ) : analytics.by_project.map((project) => (
                <div className="project-analytics-row" key={project.project_id}>
                  <span>{project.project_name}</span>
                  <strong>{project.productivity_score}</strong>
                  <span>{project.completion_rate}% complete</span>
                  <span>{project.predicted_overdue_tasks} at risk</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
};

export default Dashboard;
