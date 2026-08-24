// Rutas de administracion, montadas en /api/admin. Todo el panel es
// exclusivo del rol ADMIN.

const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth('admin'));

router.get('/stats', adminController.stats);
router.get('/participants', adminController.participants);
router.get('/access-logs', adminController.accessLogs);

// Cuentas de Rescatista/Admin (?role=rescatista | ?role=admin): no tienen
// ficha de participante, por eso no salen en /participants.
router.get('/accounts', adminController.accountsByRole);

// Crea cuentas de RESCATISTA o ADMIN. No hay auto-registro para estos
// roles: los otorga un admin ya existente, porque implican acceso a datos
// de salud de cualquier participante.
router.post('/users', adminController.createUser);

// Borra una cuenta completa (perfil + login) y su ficha de participante si
// tenia, buscando por DNI. Uso principal: liberar DNIs de prueba que hoy
// bloquean el registro/login real.
router.delete('/accounts/:dni', adminController.deleteAccount);

// Restablece la contraseña de una cuenta (participante/rescatista/admin)
// sin pasar por el mail de recuperación.
router.put('/accounts/:dni/password', adminController.resetPassword);

module.exports = router;
