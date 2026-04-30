const pool = require('../config/db');

const create = async ({ name, email, passwordHash }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );

  return rows[0];
};

const findByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, password, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );

  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );

  return rows[0] || null;
};

module.exports = {
  create,
  findByEmail,
  findById
};
