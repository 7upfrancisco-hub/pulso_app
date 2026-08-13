// Rutas de la API de participantes, montadas en /api/participants.
//
// /rescue y /:id/qr se declaran ANTES de /:id a proposito: en Express las
// rutas se matchean en orden de declaracion, y "rescue" o un id seguido de
// "/qr" también matchearían el parametro :id si esa ruta estuviera primero.

const express = require('express');
const participantController = require('../controllers/participant.controller');

const router = express.Router();

router.get('/', participantController.list);
router.post('/', participantController.create);

// Busqueda para RESCATISTA: ?token=<uuid> | ?dni=<dni> | ?pulso_code=<codigo>
router.get('/rescue', participantController.rescueLookup);

router.get('/:id/qr', participantController.getQr);

router.get('/:id', participantController.getById);
router.put('/:id', participantController.update);
router.delete('/:id', participantController.remove);

module.exports = router;
