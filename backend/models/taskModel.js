const pool = require('../config/db');
const { attachRisk } = require('../services/riskService');

const create = async ({ title, description, assignedTo, projectId, status, deadline }) => {
  const taskStatus = status || 'To Do';
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, assigned_to, project_id, status, deadline, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5 = 'Done' THEN NOW() ELSE NULL END)
     RETURNING id, title, description, assigned_to, project_id, status, deadline, created_at, updated_at, completed_at`,
    [title, description || null, assignedTo, projectId, taskStatus, deadline]
  );

  return attachRisk(rows[0]);
};

const findByProject = async ({ projectId, assignedTo }) => {
  const params = [projectId];
  let visibilityClause = '';

  if (assignedTo) {
    params.push(assignedTo);
    visibilityClause = 'AND t.assigned_to = $2';
  }

  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.title,
       t.description,
       t.assigned_to,
       assigned.name AS assigned_to_name,
       assigned.email AS assigned_to_email,
       t.project_id,
       t.status,
       t.deadline,
       t.created_at,
       t.updated_at,
       t.completed_at,
       COALESCE(load.open_tasks, 0)::int AS assigned_open_tasks,
       COALESCE(load.overdue_tasks, 0)::int AS assigned_overdue_tasks
     FROM tasks t
     LEFT JOIN users assigned ON assigned.id = t.assigned_to
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE workload.status <> 'Done') AS open_tasks,
         COUNT(*) FILTER (WHERE workload.status <> 'Done' AND workload.deadline < NOW()) AS overdue_tasks
       FROM tasks workload
       WHERE workload.assigned_to = t.assigned_to
     ) load ON true
     WHERE t.project_id = $1 ${visibilityClause}
     ORDER BY
       CASE t.status
         WHEN 'To Do' THEN 1
         WHEN 'In Progress' THEN 2
         WHEN 'Done' THEN 3
         ELSE 4
       END,
       t.deadline ASC`,
    params
  );

  return rows.map(attachRisk);
};

const findById = async (taskId) => {
  const { rows } = await pool.query(
    `SELECT id, title, description, assigned_to, project_id, status, deadline, created_at, updated_at, completed_at
     FROM tasks
     WHERE id = $1`,
    [taskId]
  );

  return rows[0] || null;
};

const update = async (taskId, updates) => {
  const columnMap = {
    title: 'title',
    description: 'description',
    assignedTo: 'assigned_to',
    status: 'status',
    deadline: 'deadline'
  };

  const fields = Object.keys(updates).filter((key) => key in columnMap);

  if (fields.length === 0) {
    return findById(taskId);
  }

  const setClauses = fields.map((key, index) => `${columnMap[key]} = $${index + 2}`);
  const values = fields.map((key) => updates[key]);

  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    if (updates.status === 'Done') {
      setClauses.push('completed_at = COALESCE(completed_at, NOW())');
    } else {
      setClauses.push('completed_at = NULL');
    }
  }

  setClauses.push('updated_at = NOW()');

  const { rows } = await pool.query(
    `UPDATE tasks
     SET ${setClauses.join(', ')}
     WHERE id = $1
     RETURNING id, title, description, assigned_to, project_id, status, deadline, created_at, updated_at, completed_at`,
    [taskId, ...values]
  );

  return rows[0] ? attachRisk(rows[0]) : null;
};

const findVisibleForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.title,
       t.description,
       t.assigned_to,
       assigned.name AS assigned_to_name,
       assigned.email AS assigned_to_email,
       t.project_id,
       p.name AS project_name,
       pm.role AS project_role,
       t.status,
       t.deadline,
       t.created_at,
       t.updated_at,
       t.completed_at,
       COALESCE(load.open_tasks, 0)::int AS assigned_open_tasks,
       COALESCE(load.overdue_tasks, 0)::int AS assigned_overdue_tasks
     FROM tasks t
     INNER JOIN projects p ON p.id = t.project_id
     INNER JOIN project_members pm ON pm.project_id = t.project_id
     LEFT JOIN users assigned ON assigned.id = t.assigned_to
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE workload.status <> 'Done') AS open_tasks,
         COUNT(*) FILTER (WHERE workload.status <> 'Done' AND workload.deadline < NOW()) AS overdue_tasks
       FROM tasks workload
       WHERE workload.assigned_to = t.assigned_to
     ) load ON true
     WHERE pm.user_id = $1
       AND (pm.role = 'admin' OR t.assigned_to = $1)
     ORDER BY t.deadline ASC`,
    [userId]
  );

  return rows.map(attachRisk);
};

const dashboardStats = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(t.id)::int AS total_tasks,
       COUNT(t.id) FILTER (WHERE t.status = 'Done')::int AS completed_tasks,
       COUNT(t.id) FILTER (WHERE t.status <> 'Done')::int AS pending_tasks,
       COUNT(t.id) FILTER (WHERE t.status <> 'Done' AND t.deadline < NOW())::int AS overdue_tasks
     FROM tasks t
     INNER JOIN project_members pm ON pm.project_id = t.project_id
     WHERE pm.user_id = $1
       AND (pm.role = 'admin' OR t.assigned_to = $1)`,
    [userId]
  );

  return rows[0] || {
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    overdue_tasks: 0
  };
};

module.exports = {
  create,
  findByProject,
  findById,
  update,
  findVisibleForUser,
  dashboardStats
};
