// Expone la declaracion jurada vigente para que el formulario de registro
// siempre muestre el mismo texto que el backend usa para timbrar la
// aceptacion (fuente unica de verdad: src/config/declaration.js).

const { DECLARATION_VERSION, DECLARATION_TEXT } = require('../config/declaration');

function get(req, res) {
  res.json({ version: DECLARATION_VERSION, text: DECLARATION_TEXT });
}

module.exports = { get };
