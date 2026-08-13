const env = require('./src/config/env');
const app = require('./src/app');

app.listen(env.port, () => {
  console.log(`Emergency Pass corriendo en http://localhost:${env.port} [${env.nodeEnv}]`);
});
