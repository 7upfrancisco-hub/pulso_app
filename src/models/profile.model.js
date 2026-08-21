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

module.exports = { create, findByDni };
