const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

if (!env.supabaseUrl || !env.supabaseServiceKey) {
  throw new Error(
    'Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en las variables de entorno (ver .env.example)'
  );
}

// Cliente server-side: usa la service role key (nunca la anon key), porque
// hoy toda la autorizacion la hace el backend, no hay RLS todavia.
const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false },
});

module.exports = supabase;
