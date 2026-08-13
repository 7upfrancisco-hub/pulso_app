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

module.exports = { record, findByParticipant };
