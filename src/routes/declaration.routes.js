// Ruta de la declaracion jurada, montada en /api/declaration.

const express = require('express');
const declarationController = require('../controllers/declaration.controller');

const router = express.Router();

router.get('/', declarationController.get);

module.exports = router;
