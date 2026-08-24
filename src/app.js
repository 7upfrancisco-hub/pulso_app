const express = require('express');
const path = require('path');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const participantRoutes = require('./routes/participant.routes');
const adminRoutes = require('./routes/admin.routes');
const declarationRoutes = require('./routes/declaration.routes');
const viewsRoutes = require('./routes/views.routes');

const app = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// `index: false` porque "/" ahora la maneja viewsRoutes (chequea si ya hay
// sesion antes de servir el login) en vez del index.html automatico de
// express.static; el resto de los archivos estaticos (css/js/icons/etc.)
// no se ven afectados por esta opcion.
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/declaration', declarationRoutes);
app.use('/', viewsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
