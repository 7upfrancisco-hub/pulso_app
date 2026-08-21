// Rutas de administracion, montadas en /api/admin. Todo el panel es
// exclusivo del rol ADMIN.

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth('admin'));

router.get('/stats', adminController.stats);
router.get('/participants', adminController.participants);

// Crea cuentas de RESCATISTA o ADMIN. No hay auto-registro para estos
// roles: los otorga un admin ya existente, porque implican acceso a datos
// de salud de cualquier participante.
router.post('/users', adminController.createUser);

module.exports = router;
