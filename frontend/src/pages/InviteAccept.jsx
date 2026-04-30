import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';

const InviteAccept = () => {
  const { token } = useParams();
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [project, setProject] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('pendingInviteToken', token);
      return;
    }

    const acceptInvite = async () => {
      setStatus('loading');

      try {
        const { data } = await api.post('/invites/accept', { token });
        localStorage.removeItem('pendingInviteToken');
        setProject(data.project);
        setMessage(`You joined ${data.project.name}.`);
        setStatus('success');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Unable to accept invite');
        setStatus('error');
      }
    };

    acceptInvite();
  }, [isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div className="auth-copy">
            <span className="eyebrow">Project invite</span>
            <h1>Sign in to accept</h1>
            <p>This invite will be waiting after authentication.</p>
          </div>
          <div className="card-actions">
            <Link className="primary-button" to="/login">Sign in</Link>
            <Link className="secondary-button" to="/signup">Create account</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <span className="eyebrow">Project invite</span>
          <h1>{status === 'loading' ? 'Accepting invite' : 'Invite status'}</h1>
          {status === 'success' && <CheckCircle2 className="success-icon" size={42} />}
          {status === 'error' && <ShieldAlert className="danger-icon" size={42} />}
          <p>{status === 'loading' ? 'Adding you to the project...' : message}</p>
        </div>

        <div className="card-actions">
          {project ? (
            <Link className="primary-button" to={`/projects/${project.id}/tasks`}>
              Open task board
            </Link>
          ) : (
            <Link className="secondary-button" to="/projects">
              View projects
            </Link>
          )}
        </div>
      </section>
    </main>
  );
};

export default InviteAccept;
