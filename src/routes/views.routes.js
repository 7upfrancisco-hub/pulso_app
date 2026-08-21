// Mapea URLs "lindas" a los archivos HTML estaticos en public/pages.
// No hay logica de negocio aca: el HTML/JS del lado del cliente hace todo
// el trabajo llamando a la API. Esto existe solo para que rutas como
// /r/:id (la que codifica el QR) o /perfil/:id tengan una URL legible en
// vez de query strings.

const express = require('express');
const path = require('path');
const { requirePage } = require('../middleware/auth.middleware');

const router = express.Router();
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');

const page = (file) => (req, res) => res.sendFile(path.join(PAGES_DIR, file));

// Publicas: loguearse, registrarse (para tener cuenta) y abrir el link del
// QR (para que cualquiera que encuentre al participante vea su ficha sin
// login). `/login` sirve el mismo archivo que la raiz ("/" ya es la
// pantalla de login desde esta etapa).
router.get('/login', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));
router.get('/registro', page('registro.html'));
router.get('/r/:id', page('rescate.html'));

// Protegidas por rol. El propio /perfil/:id no valida que el :id coincida
// con el participantId de la sesion aca (es solo la pagina HTML estatica);
// esa validacion la hace la API (GET /api/participants/:id, ver
// requireOwnParticipantOrAdmin) cuando la pagina pide los datos.
router.get('/perfil/:id', requirePage('participante', 'admin'), page('perfil.html'));
router.get('/rescatista', requirePage('rescatista', 'admin'), page('rescatista.html'));
router.get('/admin', requirePage('admin'), page('admin.html'));

module.exports = router;
