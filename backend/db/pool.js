const { Pool } = require('pg');

// Prefer a single DATABASE_URL (works well with docker-compose / hosted
// Postgres). Fall back to individual PG* vars, which `pg` also reads
// natively, so passing no config to `Pool` already works via env vars --
// we just make the DATABASE_URL preference explicit here.
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'securebank',
    };

const pool = new Pool(connectionConfig);

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;
