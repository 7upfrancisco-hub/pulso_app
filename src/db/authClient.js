// Cliente Supabase de un solo uso, exclusivo para verificar contraseñas
// (auth.signInWithPassword) en el login.
//
// `signInWithPassword` pisa la sesion interna del cliente que lo llama. Si
// se llamara sobre el cliente compartido de src/db/connection.js (que usa
// la service role key para TODAS las consultas del servidor), el login de
// un usuario cualquiera dejaria a ese cliente compartido actuando como ese
// usuario para el resto de los pedidos, en vez de con permisos de
// servidor -- rompiendo silenciosamente cualquier operacion protegida por
// Row Level Security que corra despues, sin relacion con quien logueo.
// Por eso cada intento de login arma una instancia nueva y descartable.

const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

function createAuthCheckClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = { createAuthCheckClient };
