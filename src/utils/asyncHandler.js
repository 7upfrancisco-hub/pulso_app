// Express 4 no atrapa rechazos de promesas en route handlers async: sin
// este wrapper, un error en una query a Supabase quedaria como una promesa
// rechazada sin manejar en vez de llegar al middleware de errores.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
