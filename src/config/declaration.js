// Fuente unica de verdad para el texto y version de la declaracion jurada.
// El backend la usa para validar/timbrar la aceptacion; el frontend la
// consume via GET /api/declaration para mostrar siempre el mismo texto.

const DECLARATION_VERSION = '2026-08-05.v1';

const DECLARATION_TEXT =
  'Declaro que la información proporcionada es verdadera, completa y actualizada según mi ' +
  'conocimiento. Entiendo que PULSO almacena y pone a disposición la información que yo mismo ' +
  'declaro y que PULSO no constituye una ficha médica, historia clínica ni certificación médica.';

module.exports = { DECLARATION_VERSION, DECLARATION_TEXT };
