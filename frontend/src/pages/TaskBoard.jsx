import { CalendarDays, Check, Plus, Radio } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import { connectRealtime } from '../services/socket';

const statuses = ['To Do', 'In Progress', 'Done'];

const formatDeadline = (value) => {
  if (!value) {
    return 'No deadline';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

const isOverdue = (task) => task.status !== 'Done' && new Date(task.deadline) < new Date();

const formatActivity = (event) => {
  const actor = event.actor_name || 'System';
  const labels = {
    'task.created': 'created a task',
    'task.updated': 'updated a task',
    'member.upserted': 'updated a member',
    'member.removed': 'removed a member',
    'invite.created': 'created an invite',
    'invite.accepted': 'accepted an invite',
    'invite.revoked': 'revoked an invite',
    'project.created': 'created the project'
  };

  return `${actor} ${labels[event.action] || event.action}`;
};

const TaskBoard = () => {
  const { projectId } = useParams();
  const { token } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedTo: '',
    deadline: '',
    status: 'To Do'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = project?.role === 'admin';

  const groupedTasks = useMemo(() => statuses.reduce((groups, status) => ({
    ...groups,
    [status]: tasks.filter((task) => task.status === status)
  }), {}), [tasks]);

  const loadProjectContext = async () => {
    setError('');

    try {
      const [
        { data: projectData },
        { data: membersData },
        { data: taskData },
        { data: activityData }
      ] = await Promise.all([
        api.get('/projects'),
        api.get(`/projects/${projectId}/members`),
        api.get(`/tasks/${projectId}`),
        api.get(`/projects/${projectId}/activity`)
      ]);

      const currentProject = projectData.projects.find((item) => item.id === projectId);

      if (!currentProject) {
        setError('Project not found or unavailable');
      }

      setProject(currentProject || null);
      setMembers(membersData.members);
      setTasks(taskData.tasks);
      setActivity(activityData.activity);
      setTaskForm((current) => ({
        ...current,
        assignedTo: current.assignedTo || membersData.members[0]?.user_id || ''
      }));
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to load task board');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    const [{ data: taskData }, { data: activityData }] = await Promise.all([
      api.get(`/tasks/${projectId}`),
      api.get(`/projects/${projectId}/activity`)
    ]);
    setTasks(taskData.tasks);
    setActivity(activityData.activity);
  };

  useEffect(() => {
    loadProjectContext();
  }, [projectId]);

  useEffect(() => {
    const socket = connectRealtime(token);

    if (!socket) {
      return undefined;
    }

    const refreshOnProjectEvent = (event) => {
      if (event.projectId === projectId) {
        loadProjectContext();
      }
    };

    socket.emit('subscribe:project', projectId);
    socket.on('project:event', refreshOnProjectEvent);

    return () => {
      socket.off('project:event', refreshOnProjectEvent);
    };
  }, [projectId, token]);

  const updateTaskForm = (event) => {
    setTaskForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const createTask = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.post('/tasks', {
        ...taskForm,
        projectId,
        deadline: new Date(taskForm.deadline).toISOString()
      });
      setTaskForm((current) => ({
        title: '',
        description: '',
        assignedTo: current.assignedTo,
        deadline: '',
        status: 'To Do'
      }));
      await loadTasks();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const updateTask = async (taskId, payload) => {
    setError('');

    try {
      await api.put(`/tasks/${taskId}`, payload);
      await loadTasks();
    } catch (apiError) {
      setError(apiError.response?.data?.message || 'Unable to update task');
    }
  };

  if (loading) {
    return <div className="screen-message">Loading task board...</div>;
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Task board</span>
          <h1>{project?.name || 'Project'}</h1>
        </div>
        <Link className="secondary-button" to="/projects">
          Back to projects
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isAdmin && (
        <form className="task-form" onSubmit={createTask}>
          <div className="form-grid">
            <label>
              Title
              <input
                name="title"
                onChange={updateTaskForm}
                required
                type="text"
                value={taskForm.title}
              />
            </label>

            <label>
              Assign to
              <select
                name="assignedTo"
                onChange={updateTaskForm}
                required
                value={taskForm.assignedTo}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select name="status" onChange={updateTaskForm} value={taskForm.status}>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label>
              Deadline
              <input
                name="deadline"
                onChange={updateTaskForm}
                required
                type="datetime-local"
                value={taskForm.deadline}
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              name="description"
              onChange={updateTaskForm}
              rows="3"
              value={taskForm.description}
            />
          </label>

          <button className="primary-button" disabled={submitting} type="submit">
            <Plus size={18} />
            {submitting ? 'Creating...' : 'Create task'}
          </button>
        </form>
      )}

      <div className="board">
        {statuses.map((status) => (
          <section className="board-column" key={status}>
            <header>
              <h2>{status}</h2>
              <span>{groupedTasks[status].length}</span>
            </header>

            <div className="task-list">
              {groupedTasks[status].length === 0 ? (
                <div className="muted-row">No tasks</div>
              ) : groupedTasks[status].map((task) => (
                <article className={`task-card ${isOverdue(task) ? 'overdue' : ''}`} key={task.id}>
                  <div className="task-card-head">
                    <h3>{task.title}</h3>
                    {task.status === 'Done' ? (
                      <Check size={18} />
                    ) : (
                      <span className={`risk-badge ${task.risk_level}`}>
                        {task.risk_level} {task.risk_score}
                      </span>
                    )}
                  </div>

                  {task.description && <p>{task.description}</p>}
                  {task.status !== 'Done' && (
                    <p className="risk-reason">{task.risk_reason}</p>
                  )}

                  <div className="task-meta">
                    <span>{task.assigned_to_name || 'Unassigned'}</span>
                    <span>
                      <CalendarDays size={15} />
                      {formatDeadline(task.deadline)}
                    </span>
                  </div>

                  <div className="task-controls">
                    <select
                      aria-label={`Update status for ${task.title}`}
                      onChange={(event) => updateTask(task.id, { status: event.target.value })}
                      value={task.status}
                    >
                      {statuses.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>

                    {isAdmin && (
                      <select
                        aria-label={`Assign ${task.title}`}
                        onChange={(event) => updateTask(task.id, { assignedTo: event.target.value })}
                        value={task.assigned_to || ''}
                      >
                        {members.map((member) => (
                          <option key={member.id} value={member.user_id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="analytics-panel">
        <div className="section-title-row">
          <h2>Activity trail</h2>
          <span>
            <Radio size={15} />
            Live
          </span>
        </div>
        <div className="activity-list">
          {activity.length === 0 ? (
            <div className="muted-row">No activity yet</div>
          ) : activity.map((event) => (
            <div className="activity-row" key={event.id}>
              <strong>{formatActivity(event)}</strong>
              <span>{new Date(event.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
};

export default TaskBoard;
