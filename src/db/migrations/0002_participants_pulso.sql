-- Evolucion del modelo de participante hacia PULSO: identidad de salud
-- declarada por el participante (no ficha medica / no historia clinica).
--
-- `document_id` pasa a llamarse `dni` (es el mismo dato; se renombra para
-- que el dominio hable el mismo idioma que el resto del sistema) y se
-- vuelve unico. `pulso_code` es el identificador publico no secuencial
-- (ej. PU-8F42K) que, junto al DNI y al QR, permite ubicar al participante.
ALTER TABLE participants RENAME COLUMN document_id TO dni;

ALTER TABLE participants ADD COLUMN first_name TEXT;
ALTER TABLE participants ADD COLUMN last_name TEXT;
ALTER TABLE participants ADD COLUMN age INTEGER;
ALTER TABLE participants ADD COLUMN blood_group TEXT;
ALTER TABLE participants ADD COLUMN rh_factor TEXT;
ALTER TABLE participants ADD COLUMN pulso_code TEXT;

-- Declaracion jurada: el participante debe aceptarla para completar el
-- registro. Queda versionada y con fecha/hora de aceptacion.
ALTER TABLE participants ADD COLUMN declaration_accepted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE participants ADD COLUMN declaration_version TEXT;
ALTER TABLE participants ADD COLUMN declaration_accepted_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_dni ON participants (dni) WHERE dni IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_pulso_code ON participants (pulso_code) WHERE pulso_code IS NOT NULL;
