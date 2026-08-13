// Ruta de health-check, montada en /health (fuera del namespace /api,
// convencion habitual para que la lean balanceadores/monitoreo).

const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/', healthController.check);

module.exports = router;
