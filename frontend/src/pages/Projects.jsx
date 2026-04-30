import { FolderKanban, Plus, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import { connectRealtime } from '../services/socket';

const ProjectMembersPanel = ({ project, onProjectChanged }) => {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ email: '', role: 'member' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member', expiresInDays: 7 });
  const [invites, setInvites] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/projects/${project.id}/members`);
      setMembers(data.members);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to load members');
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    if (project.role !== 'admin') {
      return;
    }

    try {
      const { data } = await api.get(`/projects/${project.id}/invites`);
      setInvites(data.invites);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to load invites');
    }
  };

  useEffect(() => {
    const loadPanel = async () => {
      await loadMembers();
      await loadInvites();
    };

    loadPanel();
  }, [project.id]);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const updateInviteField = (event) => {
    setInviteForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const addMember = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post(`/projects/${project.id}/add-member`, form);
      setForm({ email: '', role: 'member' });
      await loadMembers();
      onProjectChanged();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const createInvite = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setInviteLink('');

    try {
      const { data } = await api.post(`/projects/${project.id}/invites`, {
        ...inviteForm,
        expiresInDays: Number(inviteForm.expiresInDays)
      });
      setInviteForm({ email: '', role: 'member', expiresInDays: 7 });
      setInviteLink(data.invite.invite_url);
      await loadInvites();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to create invite');
    } finally {
      setSubmitting(false);
    }
  };

  const revokeInvite = async (inviteId) => {
    setError('');

    try {
      await api.delete(`/projects/${project.id}/invites/${inviteId}`);
      await loadInvites();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to revoke invite');
    }
  };

  const removeMember = async (userId) => {
    setError('');

    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      await loadMembers();
      onProjectChanged();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to remove member');
    }
  };

  return (
    <div className="members-panel">
      {error && <div className="error-banner">{error}</div>}

      {project.role === 'admin' && (
        <>
          <form className="inline-form" onSubmit={addMember}>
            <input
              name="email"
              onChange={updateField}
              placeholder="existing-user@example.com"
              required
              type="email"
              value={form.email}
            />
            <select name="role" onChange={updateField} value={form.role}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="secondary-button" disabled={submitting} type="submit">
              <UserPlus size={17} />
              {submitting ? 'Adding...' : 'Add existing'}
            </button>
          </form>

          <form className="inline-form invite-form" onSubmit={createInvite}>
            <input
              name="email"
              onChange={updateInviteField}
              placeholder="invitee@example.com"
              required
              type="email"
              value={inviteForm.email}
            />
            <select name="role" onChange={updateInviteField} value={inviteForm.role}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <input
              aria-label="Invite expires in days"
              max="30"
              min="1"
              name="expiresInDays"
              onChange={updateInviteField}
              type="number"
              value={inviteForm.expiresInDays}
            />
            <button className="secondary-button" disabled={submitting} type="submit">
              Create invite
            </button>
          </form>

          {inviteLink && (
            <div className="invite-link-row">
              <input readOnly value={inviteLink} />
              <button
                className="secondary-button"
                onClick={() => navigator.clipboard?.writeText(inviteLink)}
                type="button"
              >
                Copy
              </button>
            </div>
          )}
        </>
      )}

      {loading ? (
        <div className="muted-row">Loading members...</div>
      ) : (
        <div className="member-list">
          {members.map((member) => (
            <div className="member-row" key={member.id}>
              <div>
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              <span className={`role-badge ${member.role}`}>{member.role}</span>
              {project.role === 'admin' && (
                <button
                  aria-label={`Remove ${member.name}`}
                  className="icon-button danger"
                  onClick={() => removeMember(member.user_id)}
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {project.role === 'admin' && (
        <div className="invite-list">
          <strong>Invites</strong>
          {invites.length === 0 ? (
            <div className="muted-row">No invites</div>
          ) : invites.map((invite) => (
            <div className="member-row" key={invite.id}>
              <div>
                <strong>{invite.email}</strong>
                <span>
                  {invite.accepted_at ? 'Accepted' : invite.revoked_at ? 'Revoked' : 'Pending'}
                </span>
              </div>
              <span className={`role-badge ${invite.role}`}>{invite.role}</span>
              {!invite.accepted_at && !invite.revoked_at && (
                <button
                  className="icon-button danger"
                  onClick={() => revokeInvite(invite.id)}
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Projects = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = async () => {
    setError('');

    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const socket = connectRealtime(token);

    if (!socket) {
      return undefined;
    }

    socket.on('project:event', loadProjects);
    socket.on('dashboard:update', loadProjects);

    return () => {
      socket.off('project:event', loadProjects);
      socket.off('dashboard:update', loadProjects);
    };
  }, [token]);

  const createProject = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data } = await api.post('/projects', { name: projectName });
      setProjectName('');
      setExpandedProjectId(data.project.id);
      await loadProjects();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Projects</h1>
        </div>
      </div>

      <form className="create-project" onSubmit={createProject}>
        <input
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="Project name"
          required
          type="text"
          value={projectName}
        />
        <button className="primary-button" disabled={submitting} type="submit">
          <Plus size={18} />
          {submitting ? 'Creating...' : 'Create project'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="screen-message">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={38} />
          <strong>No projects yet</strong>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-head">
                <div>
                  <h2>{project.name}</h2>
                  <span>Created by {project.created_by_name}</span>
                </div>
                <span className={`role-badge ${project.role}`}>{project.role}</span>
              </div>

              <div className="project-metrics">
                <span>{project.total_tasks} tasks</span>
                <span>{project.completed_tasks} done</span>
              </div>

              <div className="card-actions">
                <Link className="secondary-button" to={`/projects/${project.id}/tasks`}>
                  Open tasks
                </Link>
                <button
                  className="ghost-button compact"
                  onClick={() => setExpandedProjectId(
                    expandedProjectId === project.id ? null : project.id
                  )}
                  type="button"
                >
                  Members
                </button>
              </div>

              {expandedProjectId === project.id && (
                <ProjectMembersPanel project={project} onProjectChanged={loadProjects} />
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Projects;
