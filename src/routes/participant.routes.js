// Rutas de la API de participantes, montadas en /api/participants.
//
// /rescue y /:id/qr se declaran ANTES de /:id a proposito: en Express las
// rutas se matchean en orden de declaracion, y "rescue" o un id seguido de
// "/qr" también matchearían el parametro :id si esa ruta estuviera primero.

const express = require('express');
const participantController = require('../controllers/participant.controller');
const { requireAuth, requireOwnParticipantOrAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth('admin'), participantController.list);
router.post('/', requireAuth('admin'), participantController.create);

// Busqueda para RESCATISTA: ?token=<uuid> | ?dni=<dni> | ?pulso_code=<codigo>
// Con `token` (vino de abrir el link del QR) queda SIN login a proposito:
// tener el QR fisico ya prueba que quien lo escanea encontro al
// participante, y en una emergencia sin rescatista a mano cualquiera tiene
// que poder abrirlo. Con `dni`/`pulso_code` (busqueda manual, no prueba
// presencia fisica) si se exige login de rescatista.
router.get(
  '/rescue',
  (req, res, next) => (req.query.token ? next() : requireAuth('rescatista', 'admin')(req, res, next)),
  participantController.rescueLookup,
);

router.get('/:id/qr', requireOwnParticipantOrAdmin, participantController.getQr);

router.get('/:id', requireOwnParticipantOrAdmin, participantController.getById);
router.put('/:id', requireOwnParticipantOrAdmin, participantController.update);
router.delete('/:id', requireAuth('admin'), participantController.remove);

module.exports = router;
