-- Tabla principal: un registro por participante de un evento deportivo.
-- El campo `id` es el UUID v4 que se codifica en el QR (/participant/{id}).
-- Nunca debe incluirse este UUID junto a datos medicos fuera de esta base.
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,

  -- Datos de identificacion
  full_name TEXT NOT NULL,
  document_id TEXT,
  birth_date TEXT,
  gender TEXT,
  phone TEXT,

  -- Ficha medica de emergencia (lo que vera el personal medico al escanear el QR)
  blood_type TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  medications TEXT,

  -- Contacto de emergencia
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,

  -- Cobertura medica
  health_insurance_provider TEXT,
  health_insurance_number TEXT,

  -- Datos del evento
  event_name TEXT,
  bib_number TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participants_document_id ON participants (document_id);
