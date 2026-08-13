// Generador del Codigo PULSO: identificador publico, corto y no
// secuencial (ej. PU-8F42K) que el participante puede usar para que un
// rescatista lo ubique sin necesidad del QR ni del DNI.

const crypto = require('node:crypto');

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para que sea facil de
// leer y transcribir a mano en una emergencia.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const PREFIX = 'PU-';

function generatePulsoCode() {
  let suffix = '';
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${PREFIX}${suffix}`;
}

module.exports = { generatePulsoCode };
