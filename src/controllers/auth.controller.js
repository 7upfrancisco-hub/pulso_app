// Login real por rol. El participante se auto-registra (email + contraseña
// + su Perfil de salud); rescatista y admin los crea un ADMIN existente
// (ver adminController.createUser). Todos loguean despues con DNI +
// contraseña: el email solo se usa puertas adentro, para hablarle a
// Supabase Auth (que trabaja con email, no con DNI).

const supabase = require('../db/connection');
const { createAuthCheckClient } = require('../db/authClient');
const participantModel = require('../models/participant.model');
const profileModel = require('../models/profile.model');
const { DECLARATION_VERSION } = require('../config/declaration');
const { setSessionCookie, clearSessionCookie } = require('../utils/session');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

const REQUIRED_FIELDS = [
  'first_name', 'last_name', 'dni', 'age',
  'emergency_contact_name', 'emergency_contact_phone', 'email', 'password',
];

function validateRequiredFields(body) {
  return REQUIRED_FIELDS.filter((field) => !body[field] || String(body[field]).trim() === '');
}

function redirectFor(profile) {
  if (profile.role === 'participante') return `/perfil/${profile.participant_id}`;
  if (profile.role === 'rescatista') return '/rescatista';
  return '/admin';
}

// Registro de PARTICIPANTE: crea la ficha de salud, la cuenta de login y el
// perfil que los une, en ese orden. Si un paso falla, deshace lo anterior
// (no debe quedar una ficha de salud "huerfana" sin cuenta, ni una cuenta
// sin ficha).
const register = asyncHandler(async (req, res) => {
  const missing = validateRequiredFields(req.body);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios', missing });
  }
  if (req.body.declaration_accepted !== true) {
    return res.status(400).json({
      error: 'Debe aceptar la declaración jurada para completar el registro',
    });
  }
  if (String(req.body.password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  let participant;
  try {
    participant = await participantModel.create({
      ...req.body,
      declaration_accepted: true,
      declaration_version: DECLARATION_VERSION,
      declaration_accepted_at: new Date().toISOString(),
    });
  } catch (err) {
    if (err.code === 'DNI_ALREADY_REGISTERED') {
      return res.status(409).json({ error: 'Ya existe un participante registrado con ese DNI' });
    }
    throw err;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: req.body.email,
    password: req.body.password,
    email_confirm: true,
  });

  if (authError) {
    await participantModel.remove(participant.id);
    const message = /already been registered|already exists/i.test(authError.message)
      ? 'Ya existe una cuenta con ese email'
      : 'No se pudo crear la cuenta';
    return res.status(400).json({ error: message });
  }

  let profile;
  try {
    profile = await profileModel.create({
      id: authData.user.id,
      dni: req.body.dni,
      email: req.body.email,
      role: 'participante',
      participantId: participant.id,
    });
  } catch (err) {
    await participantModel.remove(participant.id);
    await supabase.auth.admin.deleteUser(authData.user.id);
    if (err.code === 'DNI_ALREADY_REGISTERED') {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese DNI' });
    }
    throw err;
  }

  setSessionCookie(res, {
    id: profile.id,
    dni: profile.dni,
    role: profile.role,
    participantId: profile.participant_id,
  });

  res.status(201).json({ redirectTo: redirectFor(profile) });
});

// Login unico para los 3 roles: DNI + contraseña. El DNI resuelve a un
// email puertas adentro (Supabase Auth loguea por email); el usuario nunca
// ve ni escribe ese email para entrar.
const login = asyncHandler(async (req, res) => {
  const { dni, password } = req.body;
  if (!dni || !password) {
    return res.status(400).json({ error: 'Faltan DNI o contraseña' });
  }

  const genericError = () => res.status(401).json({ error: 'DNI o contraseña incorrectos' });

  const profile = await profileModel.findByDni(dni);
  if (!profile) return genericError();

  const { error } = await createAuthCheckClient().auth.signInWithPassword({ email: profile.email, password });
  if (error) return genericError();

  setSessionCookie(res, {
    id: profile.id,
    dni: profile.dni,
    role: profile.role,
    participantId: profile.participant_id,
  });

  res.json({ role: profile.role, redirectTo: redirectFor(profile) });
});

// Paso 1 de "olvidé mi contraseña": DNI -> resuelve el email y le pide a
// Supabase Auth que mande el mail de recuperación (misma via que ya usa
// createUser: Supabase se encarga del template y del envío). Responde igual
// exista o no el DNI, para no dejar adivinar que DNIs están registrados.
const forgotPassword = asyncHandler(async (req, res) => {
  const { dni } = req.body;
  if (!dni) {
    return res.status(400).json({ error: 'Falta el DNI' });
  }

  const profile = await profileModel.findByDni(dni);
  if (profile) {
    const { error } = await createAuthCheckClient().auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${env.publicBaseUrl}/reset-password`,
    });
    if (error) throw error;
  }

  res.json({ message: 'Si el DNI está registrado, te enviamos un email para restablecer tu contraseña.' });
});

// Paso 2: la pantalla /reset-password extrae el access_token que Supabase
// puso en el hash del link del mail (#access_token=...&type=recovery) y lo
// manda acá junto con la contraseña nueva. Se valida el token contra
// Supabase Auth (sin tocar el cliente compartido) y, si es válido, se pisa
// la contraseña vía Admin API — no hace falta abrir sesión para esto.
const resetPassword = asyncHandler(async (req, res) => {
  const { access_token: accessToken, password } = req.body;
  if (!accessToken || !password) {
    return res.status(400).json({ error: 'Faltan el token o la contraseña nueva' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const { data, error } = await createAuthCheckClient().auth.getUser(accessToken);
  if (error || !data.user) {
    return res.status(400).json({ error: 'El enlace no es válido o ya venció. Pedí uno nuevo.' });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password });
  if (updateError) throw updateError;

  res.json({ message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
});

const logout = (req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
};

module.exports = { register, login, logout, forgotPassword, resetPassword };
