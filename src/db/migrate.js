// Corredor de migraciones standalone: `npm run migrate`.
// Usa una conexion Postgres directa (DATABASE_URL), separada del cliente
// Supabase (PostgREST) que usa la app en runtime, porque DDL no se puede
// correr via PostgREST. No se ejecuta en el boot de la app (Vercel es
// serverless: correr migraciones en cada cold start es innecesario y
// arriesga contencion si arrancan varias instancias a la vez).

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../config/env');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations() {
  if (!env.databaseUrl) {
    throw new Error('Falta DATABASE_URL en las variables de entorno (ver .env.example)');
  }

  const client = new Client({ connectionString: env.databaseUrl });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }

      console.log(`[migrate] aplicada: ${file}`);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
