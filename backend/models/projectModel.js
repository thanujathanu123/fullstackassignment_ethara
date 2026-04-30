const pool = require('../config/db');

const createWithAdmin = async ({ name, createdBy }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const projectResult = await client.query(
      `INSERT INTO projects (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_by, created_at`,
      [name, createdBy]
    );

    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [projectResult.rows[0].id, createdBy]
    );

    await client.query('COMMIT');

    return {
      ...projectResult.rows[0],
      role: 'admin'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.name,
       p.created_by,
       creator.name AS created_by_name,
       p.created_at,
       pm.role,
       COUNT(t.id)::int AS total_tasks,
       COUNT(t.id) FILTER (WHERE t.status = 'Done')::int AS completed_tasks
     FROM projects p
     INNER JOIN project_members pm ON pm.project_id = p.id
     INNER JOIN users creator ON creator.id = p.created_by
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE pm.user_id = $1
     GROUP BY p.id, creator.name, pm.role
     ORDER BY p.created_at DESC`,
    [userId]
  );

  return rows;
};

const findMembership = async (projectId, userId) => {
  const { rows } = await pool.query(
    `SELECT id, project_id, user_id, role, created_at
     FROM project_members
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  return rows[0] || null;
};

const findProjectIdsForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT project_id
     FROM project_members
     WHERE user_id = $1`,
    [userId]
  );

  return rows.map((row) => row.project_id);
};

const addMember = async ({ projectId, userId, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id)
     DO UPDATE SET role = EXCLUDED.role
     RETURNING id, project_id, user_id, role, created_at`,
    [projectId, userId, role]
  );

  return rows[0];
};

const listMembers = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT
       pm.id,
       pm.project_id,
       pm.user_id,
       pm.role,
       pm.created_at,
       u.name,
       u.email
     FROM project_members pm
     INNER JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY pm.role ASC, u.name ASC`,
    [projectId]
  );

  return rows;
};

const countAdmins = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS admin_count
     FROM project_members
     WHERE project_id = $1 AND role = 'admin'`,
    [projectId]
  );

  return rows[0].admin_count;
};

const removeMember = async ({ projectId, userId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE tasks
       SET assigned_to = NULL
       WHERE project_id = $1 AND assigned_to = $2`,
      [projectId, userId]
    );

    const { rowCount } = await client.query(
      `DELETE FROM project_members
       WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId]
    );

    await client.query('COMMIT');
    return rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createWithAdmin,
  findForUser,
  findMembership,
  findProjectIdsForUser,
  addMember,
  listMembers,
  countAdmins,
  removeMember
};
