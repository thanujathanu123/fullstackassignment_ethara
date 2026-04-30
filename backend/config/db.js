const { Pool } = require('pg');

const isSslDisabled = process.env.DB_SSL === 'false';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isSslDisabled ? false : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL client error:', error);
});

module.exports = pool;
