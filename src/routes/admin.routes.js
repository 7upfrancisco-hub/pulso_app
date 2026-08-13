// Rutas de administracion, montadas en /api/admin.
// Sin autenticacion todavia: dashboard de prueba para el MVP.

const express = require('express');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.get('/stats', adminController.stats);
router.get('/participants', adminController.participants);

module.exports = router;
