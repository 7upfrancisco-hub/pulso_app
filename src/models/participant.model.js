// Capa de acceso a datos para la tabla `participants` (Supabase/Postgres).
// Toda query relacionada a participantes vive aca; el resto de la app
// (controladores, rutas) nunca debe hablarle a Supabase directamente.

const crypto = require('node:crypto');
const supabase = require('../db/connection');
const { generatePulsoCode } = require('../utils/pulsoCode');

// Campos "core" del modelo PULSO (identidad de salud declarada).
const CORE_FIELDS = [
  'first_name', 'last_name', 'dni', 'age', 'blood_group', 'rh_factor',
  'allergies', 'medical_conditions', 'medications',
  'emergency_contact_name', 'emergency_contact_phone',
];

// Campos heredados de la etapa anterior (evento deportivo genérico).
// Se mantienen operativos por compatibilidad; el nuevo formulario no los usa.
const LEGACY_FIELDS = [
  'birth_date', 'gender', 'phone',
  'health_insurance_provider', 'health_insurance_number',
  'event_name', 'bib_number', 'notes',
];

const WRITABLE_FIELDS = [...CORE_FIELDS, ...LEGACY_FIELDS];

const MAX_PULSO_CODE_ATTEMPTS = 5;

// El DNI se guarda solo con digitos (sin puntos ni espacios) para que la
// unicidad y la busqueda no dependan de como lo haya tipeado cada quien.
function normalizeDni(dni) {
  if (dni === null || dni === undefined) return null;
  const digits = String(dni).replace(/\D/g, '');
  return digits || null;
}

function normalizePulsoCode(code) {
  if (code === null || code === undefined) return null;
  const trimmed = String(code).trim().toUpperCase();
  return trimmed || null;
}

// Normaliza el payload de entrada: castea undefined a null (supabase-js,
// a diferencia de node:sqlite, tolera undefined, pero lo hacemos explicito
// para que un PATCH parcial no dependa de comportamiento implicito).
function toRow(data, fields) {
  const row = {};
  for (const field of fields) {
    row[field] = data[field] === undefined ? null : data[field];
  }
  if (fields.includes('dni')) {
    row.dni = normalizeDni(row.dni);
  }
  return row;
}

// `full_name` y `blood_type` son columnas de conveniencia derivadas de los
// campos estructurados nuevos (first_name/last_name, blood_group/rh_factor).
// Si el caller las manda explicitas (compatibilidad con la etapa anterior)
// se respetan; si no, se calculan.
function deriveDisplayFields(data) {
  const firstName = (data.first_name || '').trim();
  const lastName = (data.last_name || '').trim();
  const computedFullName = [firstName, lastName].filter(Boolean).join(' ');

  const bloodGroup = (data.blood_group || '').trim();
  const rhFactor = (data.rh_factor || '').trim();
  const computedBloodType = bloodGroup ? `${bloodGroup}${rhFactor}` : '';

  return {
    full_name: data.full_name !== undefined ? data.full_name : (computedFullName || null),
    blood_type: data.blood_type !== undefined ? data.blood_type : (computedBloodType || null),
  };
}

function isDniConflict(err) {
  return err.code === '23505' && /idx_participants_dni/.test(err.message || '');
}

function isPulsoCodeConflict(err) {
  return err.code === '23505' && /idx_participants_pulso_code/.test(err.message || '');
}

// Los caracteres `,()` rompen la sintaxis del filtro `.or()` de PostgREST;
// se descartan del termino de busqueda (no aportan nada a una busqueda de
// nombre/DNI/codigo).
function sanitizeSearchTerm(term) {
  return String(term).replace(/[,()]/g, ' ').trim();
}

// Crea el participante. El UUID (id) y el Codigo PULSO se generan siempre
// en el backend, nunca a partir de datos provistos por el request.
async function create(data) {
  const id = crypto.randomUUID();
  const row = {
    id,
    ...toRow(data, WRITABLE_FIELDS),
    ...deriveDisplayFields(data),
    declaration_accepted: data.declaration_accepted ? 1 : 0,
    declaration_version: data.declaration_version || null,
    declaration_accepted_at: data.declaration_accepted_at || null,
  };

  for (let attempt = 1; attempt <= MAX_PULSO_CODE_ATTEMPTS; attempt += 1) {
    const pulsoCode = generatePulsoCode();
    const { data: inserted, error } = await supabase
      .from('participants')
      .insert({ ...row, pulso_code: pulsoCode })
      .select()
      .single();

    if (!error) return inserted;

    if (isPulsoCodeConflict(error) && attempt < MAX_PULSO_CODE_ATTEMPTS) {
      continue; // colisión de código (muy improbable): reintentar con uno nuevo
    }
    if (isDniConflict(error)) {
      const conflictErr = new Error('DNI_ALREADY_REGISTERED');
      conflictErr.code = 'DNI_ALREADY_REGISTERED';
      throw conflictErr;
    }
    throw error;
  }

  throw new Error('No se pudo generar un Codigo PULSO unico, reintentar');
}

async function findAll() {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase.from('participants').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findByDni(dni) {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('dni', normalizeDni(dni))
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findByPulsoCode(pulsoCode) {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('pulso_code', normalizePulsoCode(pulsoCode))
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Busqueda de texto para el panel de administracion: nombre, DNI o Codigo
// PULSO.
async function search(term) {
  const safe = sanitizeSearchTerm(term);
  const like = `%${safe}%`;
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .or(`full_name.ilike.${like},dni.ilike.${like},pulso_code.ilike.${like}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Metricas para el dashboard de ADMIN.
async function getStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [total, recentlyRegistered, withAllergies, withMedications, withMedicalConditions] = await Promise.all([
    supabase.from('participants').select('*', { count: 'exact', head: true }),
    supabase.from('participants').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('participants').select('*', { count: 'exact', head: true }).not('allergies', 'is', null).neq('allergies', ''),
    supabase.from('participants').select('*', { count: 'exact', head: true }).not('medications', 'is', null).neq('medications', ''),
    supabase.from('participants').select('*', { count: 'exact', head: true }).not('medical_conditions', 'is', null).neq('medical_conditions', ''),
  ]);

  for (const result of [total, recentlyRegistered, withAllergies, withMedications, withMedicalConditions]) {
    if (result.error) throw result.error;
  }

  return {
    total: total.count,
    recentlyRegistered: recentlyRegistered.count,
    withAllergies: withAllergies.count,
    withMedications: withMedications.count,
    withMedicalConditions: withMedicalConditions.count,
  };
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  // Merge parcial: solo los campos presentes en `data` pisan a `existing`.
  const patch = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) {
      patch[field] = data[field];
    }
  }

  const merged = { ...existing, ...patch };

  // deriveDisplayFields debe recalcular full_name/blood_type a partir de
  // los campos ya mergeados (first_name/last_name, blood_group/rh_factor),
  // no repetir los viejos: por eso se le pasan `full_name`/`blood_type`
  // solo si este PUT los mando explicitos (compatibilidad), sin heredar el
  // valor ya guardado en `existing`.
  const displayInput = { ...merged, full_name: data.full_name, blood_type: data.blood_type };
  const row = { ...toRow(merged, WRITABLE_FIELDS), ...deriveDisplayFields(displayInput) };

  const { data: updated, error } = await supabase
    .from('participants')
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq('id', id)
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

  return updated;
}

async function remove(id) {
  const { data, error } = await supabase.from('participants').delete().eq('id', id).select();
  if (error) throw error;
  return data.length > 0;
}

module.exports = {
  create, findAll, findById, findByDni, findByPulsoCode, update, remove,
  search, getStats, normalizeDni,
};
