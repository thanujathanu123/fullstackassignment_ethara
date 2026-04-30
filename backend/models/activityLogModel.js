const pool = require('../config/db');

const create = async ({
  projectId = null,
  taskId = null,
  actorId = null,
  action,
  entityType,
  entityId = null,
  metadata = {}
}) => {
  const { rows } = await pool.query(
    `INSERT INTO activity_logs
       (project_id, task_id, actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, project_id, task_id, actor_id, action, entity_type, entity_id, metadata, created_at`,
    [projectId, taskId, actorId, action, entityType, entityId, metadata]
  );

  return rows[0];
};

const listByProject = async (projectId, limit = 50) => {
  const { rows } = await pool.query(
    `SELECT
       al.id,
       al.project_id,
       al.task_id,
       al.actor_id,
       actor.name AS actor_name,
       actor.email AS actor_email,
       al.action,
       al.entity_type,
       al.entity_id,
       al.metadata,
       al.created_at
     FROM activity_logs al
     LEFT JOIN users actor ON actor.id = al.actor_id
     WHERE al.project_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2`,
    [projectId, limit]
  );

  return rows;
};

const listForUserProjects = async (userId, limit = 20) => {
  const { rows } = await pool.query(
    `SELECT
       al.id,
       al.project_id,
       p.name AS project_name,
       al.task_id,
       al.actor_id,
       actor.name AS actor_name,
       al.action,
       al.entity_type,
       al.entity_id,
       al.metadata,
       al.created_at
     FROM activity_logs al
     INNER JOIN project_members pm ON pm.project_id = al.project_id
     INNER JOIN projects p ON p.id = al.project_id
     LEFT JOIN users actor ON actor.id = al.actor_id
     WHERE pm.user_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return rows;
};

module.exports = {
  create,
  listByProject,
  listForUserProjects
};
