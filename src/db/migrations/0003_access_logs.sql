-- Registro de accesos: cada consulta de un rescatista a un perfil queda
-- auditada (que participante, por que via se lo encontro, cuando).
-- Sin sistema de permisos todavia; esta tabla es la base para cuando se
-- agregue autenticacion/roles reales.
CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('QR', 'DNI', 'CODIGO_PULSO')),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_participant_id ON access_logs (participant_id);
