// Controlador de health-check: informa si el servidor y la conexion a
// Supabase estan operativos. Pensado para monitoreo/uptime checks.

const supabase = require('../db/connection');
const env = require('../config/env');

// Recorre err.cause -> err.cause.cause -> ... para no perder el motivo real
// detras de errores envueltos (ej: "fetch failed" envolviendo un ENOTFOUND).
function causeChain(err) {
  const chain = [];
  let current = err;
  while (current) {
    chain.push({ name: current.name, message: current.message, code: current.code });
    current = current.cause;
  }
  return chain;
}

function safeSupabaseHost() {
  if (!env.supabaseUrl) return 'NO_DEFINIDA';
  try {
    return new URL(env.supabaseUrl).host;
  } catch {
    return 'URL_INVALIDA';
  }
}

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
      causes: causeChain(err),
      supabaseUrlHost: safeSupabaseHost(),
    });
  }
}

module.exports = { check };
