// Crea el primer ADMIN (bootstrap): sin esto, nadie puede entrar a /admin
// para dar de alta al resto de las cuentas de Rescatista/Admin.
// Se corre una sola vez, a mano: `npm run seed:admin`.
// Lee los datos de variables de entorno para no dejar una contraseña
// tipeada en la terminal (que puede quedar en el historial del shell).

const supabase = require('../db/connection');
const profileModel = require('../models/profile.model');

async function seedAdmin() {
  const dni = process.env.ADMIN_DNI;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!dni || !email || !password) {
    throw new Error(
      'Faltan ADMIN_DNI / ADMIN_EMAIL / ADMIN_PASSWORD. Ejemplo:\n' +
      '  ADMIN_DNI=12345678 ADMIN_EMAIL=vos@mail.com ADMIN_PASSWORD=algo-seguro npm run seed:admin'
    );
  }

  const existing = await profileModel.findByDni(dni);
  if (existing) {
    console.log(`[seed:admin] ya existe una cuenta con DNI ${dni} (rol: ${existing.role}) — se omite`);
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw authError;

  const profile = await profileModel.create({ id: authData.user.id, dni, email, role: 'admin' });
  console.log(`[seed:admin] admin creado: DNI ${profile.dni} / ${profile.email}`);
}

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedAdmin };
