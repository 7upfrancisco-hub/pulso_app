// Capa de acceso a datos para `profiles`: vincula una cuenta de Supabase
// Auth con su DNI (Identidad PULSO), rol y, si es participante, su ficha.

const supabase = require('../db/connection');
const { normalizeDni } = require('./participant.model');

function isDniConflict(err) {
  return err.code === '23505' && /idx_profiles_dni/.test(err.message || '');
}

async function create({ id, dni, email, role, participantId }) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id,
      dni: normalizeDni(dni),
      email,
      role,
      participant_id: participantId || null,
    })
    .select()
    .single();

  if (error) {
    if (isDniConflict(error)) {
      const conflictErr = new Error('DNI_ALREADY_REGISTERED');
      conflictErr.code = 'DNI_ALREADY_REGISTERED';
      throw conflictErr;
    }
    throw error;
  }
  return data;
}

async function findByDni(dni) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('dni', normalizeDni(dni))
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Limite de intentos de login (item 4 del roadmap): frena a alguien
// probando contraseñas contra el DNI de otra persona, sin agregar una
// tabla aparte para un simple contador por cuenta.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function registerFailedLogin(profile) {
  const attempts = (profile.failed_login_attempts || 0) + 1;
  const lockedOut = attempts >= MAX_FAILED_ATTEMPTS;

  const { error } = await supabase
    .from('profiles')
    .update({
      failed_login_attempts: lockedOut ? 0 : attempts,
      locked_until: lockedOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString() : null,
    })
    .eq('id', profile.id);
  if (error) throw error;
}

async function clearFailedLogins(id) {
  const { error } = await supabase
    .from('profiles')
    .update({ failed_login_attempts: 0, locked_until: null })
    .eq('id', id);
  if (error) throw error;
}

module.exports = { create, findByDni, registerFailedLogin, clearFailedLogins };
