// Datos ficticios para probar el flujo completo de PULSO sin tener que
// registrar participantes a mano. Idempotente: si el DNI ya existe, lo
// salta en vez de duplicarlo.
// Requiere que las migraciones ya se hayan corrido (`npm run migrate`).

const participantModel = require('../models/participant.model');
const { DECLARATION_VERSION } = require('../config/declaration');

const FAKE_PARTICIPANTS = [
  {
    first_name: 'Marina',
    last_name: 'Sosa Ibáñez',
    dni: '38456123',
    age: 29,
    blood_group: 'O',
    rh_factor: '+',
    allergies: 'Penicilina',
    medical_conditions: '',
    medications: '',
    emergency_contact_name: 'Carla Ibáñez',
    emergency_contact_phone: '+54 9 11 4011-2233',
  },
  {
    first_name: 'Lucas',
    last_name: 'Fernández',
    dni: '40222789',
    age: 34,
    blood_group: 'A',
    rh_factor: '+',
    allergies: 'Maní',
    medical_conditions: 'Asma',
    medications: 'Salbutamol',
    emergency_contact_name: 'Noelia Fernández',
    emergency_contact_phone: '+54 9 11 4022-8899',
  },
  {
    first_name: 'Valentina',
    last_name: 'Torres',
    dni: '41789456',
    age: 22,
    blood_group: 'B',
    rh_factor: '-',
    allergies: '',
    medical_conditions: '',
    medications: '',
    emergency_contact_name: 'Roberto Torres',
    emergency_contact_phone: '+54 9 11 5566-7788',
  },
  {
    // Caso limite a propósito: sin ningún dato de salud declarado, para
    // probar los estados vacíos ("No declarado") en la vista de rescate.
    first_name: 'Sofía',
    last_name: 'Gómez',
    dni: '42345678',
    age: 19,
    blood_group: '',
    rh_factor: '',
    allergies: '',
    medical_conditions: '',
    medications: '',
    emergency_contact_name: 'Diego Gómez',
    emergency_contact_phone: '+54 9 11 3344-5566',
  },
];

async function seed() {
  for (const data of FAKE_PARTICIPANTS) {
    const existing = await participantModel.findByDni(data.dni);
    if (existing) {
      console.log(`[seed] ya existe (DNI ${data.dni}): ${existing.full_name} — se omite`);
      continue;
    }

    const participant = await participantModel.create({
      ...data,
      declaration_accepted: true,
      declaration_version: DECLARATION_VERSION,
      declaration_accepted_at: new Date().toISOString(),
    });

    console.log(`[seed] creado: ${participant.full_name} (${participant.pulso_code})`);
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };
