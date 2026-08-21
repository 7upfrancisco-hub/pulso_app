// Protege rutas de API y de paginas segun rol. `req.user` = { id, dni,
// role, participantId } cuando hay sesion valida (ver src/utils/session.js).

const { getSessionUser } = require('../utils/session');

function homeFor(user) {
  if (user.role === 'rescatista') return '/rescatista';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'participante' && user.participantId) return `/perfil/${user.participantId}`;
  return '/login';
}

// Para rutas de API (devuelven JSON): 401/403 sin sesion o sin permiso.
function requireAuth(...allowedRoles) {
  return (req, res, next) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Debés iniciar sesión' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No tenés permiso para esto' });
    }
    req.user = user;
    next();
  };
}

// Para rutas de pantallas (HTML): sin sesion o sin permiso, redirige a
// /login en vez de devolver JSON crudo.
function requirePage(...allowedRoles) {
  return (req, res, next) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.redirect('/login');
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return res.redirect(homeFor(user));
    }
    req.user = user;
    next();
  };
}

// Para /api/participants/:id y variantes: el propio participante puede
// verse a si mismo (su Identidad PULSO), un admin puede ver cualquiera.
// Rescatista NO entra aca a proposito: su via de acceso a datos de un
// participante es siempre rescueLookup (QR/DNI/Codigo), auditada en
// access_logs, nunca este endpoint "crudo".
function requireOwnParticipantOrAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Debés iniciar sesión' });
  }
  const isOwner = user.role === 'participante' && user.participantId === req.params.id;
  if (!isOwner && user.role !== 'admin') {
    return res.status(403).json({ error: 'No tenés permiso para esto' });
  }
  req.user = user;
  next();
}

module.exports = { requireAuth, requirePage, requireOwnParticipantOrAdmin };
