require('dotenv').config();

const port = parseInt(process.env.PORT, 10) || 3000;

const env = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Cliente Supabase (PostgREST): usado por la app en runtime (modelos).
  supabaseUrl: process.env.SUPABASE_URL,
  // Service role key: nunca exponer al frontend. El backend hace toda la
  // autorizacion hoy (no hay RLS todavia), asi que corre con esta key.
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  // Conexion Postgres directa: solo usada por el script de migraciones
  // (src/db/migrate.js), nunca en el request path de la app.
  databaseUrl: process.env.DATABASE_URL,
  // URL publica usada para armar el link que codifica el QR (/r/:id).
  publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${port}`,
};

module.exports = env;
