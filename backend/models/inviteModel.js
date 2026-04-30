const pool = require('../config/db');

const create = async ({ projectId, email, role, tokenHash, invitedBy, expiresAt }) => {
  const { rows } = await pool.query(
    `INSERT INTO project_invites
       (project_id, email, role, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, project_id, email, role, invited_by, expires_at, accepted_at, revoked_at, created_at`,
    [projectId, email, role, tokenHash, invitedBy, expiresAt]
  );

  return rows[0];
};

const listByProject = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT
       pi.id,
       pi.project_id,
       pi.email,
       pi.role,
       pi.invited_by,
       inviter.name AS invited_by_name,
       pi.expires_at,
       pi.accepted_at,
       pi.accepted_by,
       pi.revoked_at,
       pi.created_at
     FROM project_invites pi
     INNER JOIN users inviter ON inviter.id = pi.invited_by
     WHERE pi.project_id = $1
     ORDER BY pi.created_at DESC`,
    [projectId]
  );

  return rows;
};

const findByTokenHash = async (tokenHash) => {
  const { rows } = await pool.query(
    `SELECT
       pi.id,
       pi.project_id,
       pi.email,
       pi.role,
       pi.invited_by,
       pi.expires_at,
       pi.accepted_at,
       pi.accepted_by,
       pi.revoked_at,
       pi.created_at,
       p.name AS project_name
     FROM project_invites pi
     INNER JOIN projects p ON p.id = pi.project_id
     WHERE pi.token_hash = $1`,
    [tokenHash]
  );

  return rows[0] || null;
};

const findById = async (inviteId) => {
  const { rows } = await pool.query(
    `SELECT id, project_id, email, role, invited_by, expires_at, accepted_at, accepted_by, revoked_at, created_at
     FROM project_invites
     WHERE id = $1`,
    [inviteId]
  );

  return rows[0] || null;
};

const markAccepted = async ({ inviteId, acceptedBy }) => {
  const { rows } = await pool.query(
    `UPDATE project_invites
     SET accepted_at = NOW(), accepted_by = $2
     WHERE id = $1
     RETURNING id, project_id, email, role, invited_by, expires_at, accepted_at, accepted_by, revoked_at, created_at`,
    [inviteId, acceptedBy]
  );

  return rows[0] || null;
};

const revoke = async (inviteId) => {
  const { rows } = await pool.query(
    `UPDATE project_invites
     SET revoked_at = NOW()
     WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL
     RETURNING id, project_id, email, role, invited_by, expires_at, accepted_at, accepted_by, revoked_at, created_at`,
    [inviteId]
  );

  return rows[0] || null;
};

module.exports = {
  create,
  listByProject,
  findByTokenHash,
  findById,
  markAccepted,
  revoke
};
