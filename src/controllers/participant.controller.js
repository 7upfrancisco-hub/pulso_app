// Controlador de participantes: valida el request y delega en el modelo.
// Expone tres superficies distintas de la misma entidad:
//  - CRUD interno (list/getById/create/update/remove): admin y auto-gestion.
//  - rescueLookup: lo que ve un RESCATISTA al buscar por QR/DNI/Codigo PULSO
//    (solo informacion de salud declarada, nunca el DNI ni datos internos).
//  - getQr: genera el QR (una URL de token, nunca datos medicos).

const participantModel = require('../models/participant.model');
const accessLogModel = require('../models/accessLog.model');
const { generateQrDataUrl } = require('../utils/qr');
const { DECLARATION_VERSION } = require('../config/declaration');
const asyncHandler = require('../utils/asyncHandler');

// Nombre, DNI, edad y contacto de emergencia son minimos para que el
// registro sirva en una emergencia. Datos de salud (grupo sanguineo,
// alergias, etc.) quedan opcionales: "no declarado" tambien es informacion.
const REQUIRED_FIELDS = [
  'first_name', 'last_name', 'dni', 'age',
  'emergency_contact_name', 'emergency_contact_phone',
];

function validateRequiredFields(body) {
  return REQUIRED_FIELDS.filter((field) => !body[field] || String(body[field]).trim() === '');
}

function withStatus(participant) {
  if (!participant) return participant;
  return {
    ...participant,
    status: participant.declaration_accepted ? 'activo' : 'incompleto',
  };
}

const list = asyncHandler(async (req, res) => {
  const participants = await participantModel.findAll();
  res.json(participants.map(withStatus));
});

const getById = asyncHandler(async (req, res) => {
  const participant = await participantModel.findById(req.params.id);
  if (!participant) {
    return res.status(404).json({ error: 'Participante no encontrado' });
  }
  res.json(withStatus(participant));
});

const create = asyncHandler(async (req, res) => {
  const missing = validateRequiredFields(req.body);
  if (missing.length > 0) {
    return res.status(400).json({ error: 'Faltan campos obligatorios', missing });
  }

  if (req.body.declaration_accepted !== true) {
    return res.status(400).json({
      error: 'Debe aceptar la declaración jurada para completar el registro',
    });
  }

  try {
    const participant = await participantModel.create({
      ...req.body,
      declaration_accepted: true,
      declaration_version: DECLARATION_VERSION,
      declaration_accepted_at: new Date().toISOString(),
    });
    res.status(201).json(withStatus(participant));
  } catch (err) {
    if (err.code === 'DNI_ALREADY_REGISTERED') {
      return res.status(409).json({ error: 'Ya existe un participante registrado con ese DNI' });
    }
    throw err;
  }
});

const update = asyncHandler(async (req, res) => {
  try {
    const updated = await participantModel.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }
    res.json(withStatus(updated));
  } catch (err) {
    if (err.code === 'DNI_ALREADY_REGISTERED') {
      return res.status(409).json({ error: 'Ya existe un participante registrado con ese DNI' });
    }
    throw err;
  }
});

const remove = asyncHandler(async (req, res) => {
  const deleted = await participantModel.remove(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Participante no encontrado' });
  }
  res.status(204).send();
});

// Lo unico que un rescatista necesita para actuar. Nunca incluye DNI ni
// otros datos internos: "no mostrar informacion innecesaria".
function toRescueView(participant) {
  return {
    pulso_code: participant.pulso_code,
    full_name: participant.full_name,
    blood_group: participant.blood_group,
    rh_factor: participant.rh_factor,
    allergies: participant.allergies,
    medical_conditions: participant.medical_conditions,
    medications: participant.medications,
    emergency_contact_name: participant.emergency_contact_name,
    emergency_contact_phone: participant.emergency_contact_phone,
    updated_at: participant.updated_at,
  };
}

// Punto unico de busqueda para RESCATISTA: token de QR, DNI o Codigo PULSO.
// Cada consulta exitosa queda auditada en access_logs.
const rescueLookup = asyncHandler(async (req, res) => {
  const { token, dni, pulso_code: pulsoCode } = req.query;

  let participant = null;
  let accessType = null;

  if (token) {
    participant = await participantModel.findById(token);
    accessType = 'QR';
  } else if (dni) {
    participant = await participantModel.findByDni(dni);
    accessType = 'DNI';
  } else if (pulsoCode) {
    participant = await participantModel.findByPulsoCode(pulsoCode);
    accessType = 'CODIGO_PULSO';
  } else {
    return res.status(400).json({ error: 'Debe indicar token, dni o pulso_code' });
  }

  if (!participant) {
    return res.status(404).json({ error: 'No se encontró ningún participante' });
  }

  await accessLogModel.record(participant.id, accessType);
  res.json(toRescueView(participant));
});

// El QR codifica unicamente la URL de resolucion (/r/:id), nunca datos de
// salud. Se genera on-demand a partir del UUID, asi que actualizar la
// ficha no requiere reimprimir nada.
const getQr = asyncHandler(async (req, res) => {
  const participant = await participantModel.findById(req.params.id);
  if (!participant) {
    return res.status(404).json({ error: 'Participante no encontrado' });
  }

  const { url, dataUrl } = await generateQrDataUrl(participant.id);
  res.json({ url, qr: dataUrl });
});

module.exports = { list, getById, create, update, remove, rescueLookup, getQr };
