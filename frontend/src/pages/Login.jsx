import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { isAuthenticated, saveSession } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);
      saveSession(data);
      const pendingInviteToken = localStorage.getItem('pendingInviteToken');
      navigate(pendingInviteToken ? `/invites/${pendingInviteToken}` : '/dashboard');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to log in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <span className="eyebrow">Team Task Manager</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage projects, assignments, and task progress.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={updateField}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
          </label>

          <button className="primary-button" disabled={submitting} type="submit">
            <LogIn size={18} />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
