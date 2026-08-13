// Controlador de administracion: metricas y listado/busqueda de
// participantes para el dashboard de ADMIN. Sin autenticacion todavia
// (queda pendiente para una etapa futura junto con el resto de roles).

const participantModel = require('../models/participant.model');
const asyncHandler = require('../utils/asyncHandler');

const stats = asyncHandler(async (req, res) => {
  res.json(await participantModel.getStats());
});

// Fila resumida para la tabla del dashboard: Nombre | DNI | Codigo PULSO |
// Grupo | Ultima actualizacion.
function toTableRow(participant) {
  return {
    id: participant.id,
    full_name: participant.full_name,
    dni: participant.dni,
    pulso_code: participant.pulso_code,
    blood_type: participant.blood_type,
    updated_at: participant.updated_at,
  };
}

const participants = asyncHandler(async (req, res) => {
  const term = (req.query.search || '').trim();
  const rows = term ? await participantModel.search(term) : await participantModel.findAll();
  res.json(rows.map(toTableRow));
});

module.exports = { stats, participants };
