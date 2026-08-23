// Capa de acceso a datos para `access_logs`: auditoria de cada consulta de
// un rescatista a un perfil (via QR, DNI o Codigo PULSO).

const supabase = require('../db/connection');

const VALID_ACCESS_TYPES = new Set(['QR', 'DNI', 'CODIGO_PULSO']);

async function record(participantId, accessType) {
  if (!VALID_ACCESS_TYPES.has(accessType)) {
    throw new Error(`Tipo de acceso invalido: ${accessType}`);
  }
  const { error } = await supabase
    .from('access_logs')
    .insert({ participant_id: participantId, access_type: accessType });
  if (error) throw error;
}

async function findByParticipant(participantId) {
  const { data, error } = await supabase
    .from('access_logs')
    .select('*')
    .eq('participant_id', participantId)
    .order('accessed_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Para el panel de admin: los accesos mas recientes de cualquier
// participante, con el nombre/DNI/Codigo PULSO ya resueltos (join por la
// relacion declarada en la FK) para no tener que pedirlos aparte.
async function findRecent(limit) {
  const { data, error } = await supabase
    .from('access_logs')
    .select('id, access_type, accessed_at, participants(full_name, dni, pulso_code)')
    .order('accessed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

module.exports = { record, findByParticipant, findRecent };
