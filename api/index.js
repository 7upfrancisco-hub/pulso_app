// Entry point para Vercel: @vercel/node envuelve cualquier export que sea
// invocable como (req, res), y una app de Express ya lo es. No hay que
// escuchar un puerto aca: Vercel maneja eso por afuera.
module.exports = require('../src/app');
