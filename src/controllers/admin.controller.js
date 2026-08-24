// Controlador de administracion: metricas, listado/busqueda de
// participantes, y alta de cuentas de RESCATISTA/ADMIN para el panel.

const supabase = require('../db/connection');
const participantModel = require('../models/participant.model');
const profileModel = require('../models/profile.model');
const accessLogModel = require('../models/accessLog.model');
const { generateQrDataUrl } = require('../utils/qr');
const asyncHandler = require('../utils/asyncHandler');

const ACCESS_LOGS_LIMIT = 200;

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

// Cuentas de RESCATISTA o ADMIN para su tabla en el panel: no tienen ficha
// de participante, asi que no aparecen en la tabla de `participants`.
const accountsByRole = asyncHandler(async (req, res) => {
  const role = req.query.role;
  if (!CREATABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `role debe ser uno de: ${CREATABLE_ROLES.join(', ')}` });
  }
  res.json(await profileModel.findByRole(role));
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

// Borra una cuenta completa (perfil + login en Supabase Auth) y, si tenia
// ficha de participante asociada, tambien la ficha. Se busca por DNI porque
// es el dato visible en la tabla del dashboard y el que usa el login.
// Sirve tanto para limpiar cuentas de prueba (participante/rescatista/admin)
// como fichas de participante sueltas sin cuenta (por ejemplo, las de
// `npm run seed`), que tambien bloquean el DNI al registrarse.
const deleteAccount = asyncHandler(async (req, res) => {
  const dni = req.params.dni;
  const profile = await profileModel.findByDni(dni);
  const participant = await participantModel.findByDni(dni);

  if (!profile && !participant) {
    return res.status(404).json({ error: 'No existe ninguna cuenta ni ficha con ese DNI' });
  }
  if (profile && profile.id === req.user.id) {
    return res.status(400).json({ error: 'No podés borrar tu propia cuenta' });
  }

  if (profile) {
    const { error } = await supabase.auth.admin.deleteUser(profile.id);
    if (error) throw error;
  }

  const participantId = (profile && profile.participant_id) || (participant && participant.id);
  if (participantId) {
    await participantModel.remove(participantId);
  }

  res.status(204).send();
});

// Restablece la contraseña de una cuenta directamente (Admin API), sin el
// mail de recuperación: para cuando alguien se olvidó la contraseña y no
// tiene acceso a ese email, o para ahorrarle el paso a un rescatista.
const resetPassword = asyncHandler(async (req, res) => {
  const dni = req.params.dni;
  const { password } = req.body;

  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const profile = await profileModel.findByDni(dni);
  if (!profile) {
    return res.status(404).json({ error: 'No existe ninguna cuenta con ese DNI' });
  }

  const { error } = await supabase.auth.admin.updateUserById(profile.id, { password });
  if (error) throw error;

  res.status(204).send();
});

// Ultimos accesos de un rescatista a un perfil (QR/DNI/Codigo PULSO), para
// la seccion de auditoria del panel. Nunca incluye quien accedio: el
// acceso por QR no exige login, y access_logs no guarda ese dato hoy.
function toAccessLogRow(log) {
  return {
    id: log.id,
    full_name: log.participants?.full_name,
    dni: log.participants?.dni,
    pulso_code: log.participants?.pulso_code,
    access_type: log.access_type,
    accessed_at: log.accessed_at,
  };
}

const accessLogs = asyncHandler(async (req, res) => {
  const logs = await accessLogModel.findRecent(ACCESS_LOGS_LIMIT);
  res.json(logs.map(toAccessLogRow));
});

// Para la hoja de credenciales imprimibles: nombre + Codigo PULSO + QR de
// todos los participantes de una. Nunca datos de salud (igual criterio que
// el QR: un papel impreso se puede perder, asi que no lleva nada sensible,
// solo lo necesario para que un rescatista escanee o tipee el codigo).
const credentials = asyncHandler(async (req, res) => {
  const rows = await participantModel.findAll();
  const withQr = await Promise.all(
    rows.map(async (participant) => {
      const { dataUrl } = await generateQrDataUrl(participant.id);
      return { full_name: participant.full_name, pulso_code: participant.pulso_code, qr: dataUrl };
    })
  );
  res.json(withQr);
});

module.exports = {
  stats, participants, accountsByRole, createUser, deleteAccount, resetPassword, accessLogs, credentials,
};
