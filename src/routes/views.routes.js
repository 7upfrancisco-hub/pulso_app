// Mapea URLs "lindas" a los archivos HTML estaticos en public/pages.
// No hay logica de negocio aca: el HTML/JS del lado del cliente hace todo
// el trabajo llamando a la API. Esto existe solo para que rutas como
// /r/:id (la que codifica el QR) o /perfil/:id tengan una URL legible en
// vez de query strings.

const express = require('express');
const path = require('path');

const router = express.Router();
const PAGES_DIR = path.join(__dirname, '..', '..', 'public', 'pages');

const page = (file) => (req, res) => res.sendFile(path.join(PAGES_DIR, file));

router.get('/registro', page('registro.html'));
router.get('/perfil/:id', page('perfil.html'));
router.get('/rescatista', page('rescatista.html'));
router.get('/r/:id', page('rescate.html'));
router.get('/admin', page('admin.html'));

module.exports = router;
