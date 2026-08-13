// Generacion de QR. El QR nunca codifica datos de salud: solo una URL que
// resuelve al participante a traves del backend (/r/:id). Esto permite que
// la informacion declarada cambie sin tener que reimprimir el QR.

const QRCode = require('qrcode');
const env = require('../config/env');

function buildRescueUrl(participantId) {
  return `${env.publicBaseUrl}/r/${participantId}`;
}

async function generateQrDataUrl(participantId) {
  const url = buildRescueUrl(participantId);
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
  return { url, dataUrl };
}

module.exports = { buildRescueUrl, generateQrDataUrl };
