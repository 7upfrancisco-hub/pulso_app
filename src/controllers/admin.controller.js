// Controlador de administracion: metricas, listado/busqueda de
// participantes, y alta de cuentas de RESCATISTA/ADMIN para el panel.

const supabase = require('../db/connection');
const participantModel = require('../models/participant.model');
const profileModel = require('../models/profile.model');
const asyncHandler = require('../utils/asyncHandler');

const CREATABLE_ROLES = ['rescatista', 'admin'];

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

// Alta de una cuenta de RESCATISTA o ADMIN: crea el usuario en Supabase
// Auth y su perfil (DNI + rol). Sin ficha de salud asociada: estos roles
// no son un participante.
const createUser = asyncHandler(async (req, res) => {
  const { dni, email, password, role } = req.body;

  if (!dni || !email || !password || !role) {
    return res.status(400).json({ error: 'Faltan dni, email, password o role' });
  }
  if (!CREATABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `role debe ser uno de: ${CREATABLE_ROLES.join(', ')}` });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const message = /already been registered|already exists/i.test(authError.message)
      ? 'Ya existe una cuenta con ese email'
      : 'No se pudo crear la cuenta';
    return res.status(400).json({ error: message });
  }

  try {
    const profile = await profileModel.create({ id: authData.user.id, dni, email, role });
    res.status(201).json({ id: profile.id, dni: profile.dni, email: profile.email, role: profile.role });
  } catch (err) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    if (err.code === 'DNI_ALREADY_REGISTERED') {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese DNI' });
    }
    throw err;
  }
});

module.exports = { stats, participants, createUser };
