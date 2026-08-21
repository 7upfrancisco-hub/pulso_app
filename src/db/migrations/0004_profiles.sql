-- Etapa 5: login real por rol (participante / rescatista / admin).
-- `profiles` vincula cada cuenta de Supabase Auth (auth.users) con su DNI
-- (la Identidad PULSO se ingresa con DNI + contrasena, no con el email) y
-- su rol. `email` se duplica desde auth.users solo para poder resolver
-- DNI -> email al loguear sin llamar a la Admin API en cada intento.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dni TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('participante', 'rescatista', 'admin')),
  -- Solo los perfiles de rol 'participante' tienen un participante asociado;
  -- rescatista/admin son cuentas de acceso, no fichas de salud.
  participant_id TEXT REFERENCES participants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_dni ON profiles (dni);
