import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';

const Signup = () => {
  const navigate = useNavigate();
  const { isAuthenticated, saveSession } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      const { data } = await api.post('/auth/signup', form);
      saveSession(data);
      const pendingInviteToken = localStorage.getItem('pendingInviteToken');
      navigate(pendingInviteToken ? `/invites/${pendingInviteToken}` : '/dashboard');
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <span className="eyebrow">Team Task Manager</span>
          <h1>Create account</h1>
          <p>Start a workspace, invite project members, and assign tasks.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <label>
            Name
            <input
              autoComplete="name"
              name="name"
              onChange={updateField}
              required
              type="text"
              value={form.name}
            />
          </label>

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
              autoComplete="new-password"
              minLength="8"
              name="password"
              onChange={updateField}
              required
              type="password"
              value={form.password}
            />
          </label>

          <button className="primary-button" disabled={submitting} type="submit">
            <UserPlus size={18} />
            {submitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
};

export default Signup;
