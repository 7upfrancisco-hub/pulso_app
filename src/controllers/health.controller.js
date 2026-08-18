// Controlador de health-check: informa si el servidor y la conexion a
// Supabase estan operativos. Pensado para monitoreo/uptime checks.

const supabase = require('../db/connection');

async function check(req, res) {
  try {
    const { error } = await supabase.from('participants').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      message: err.message,
      cause: err.cause ? String(err.cause) : undefined,
    });
  }
}

module.exports = { check };
