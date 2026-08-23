-- Etapa 6, item 4: limite de intentos de login para frenar fuerza bruta
-- probando contraseñas contra el DNI de otra persona. Se guarda en
-- `profiles` (no en una tabla aparte) porque es un contador por cuenta,
-- igual de simple que un par de columnas.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
