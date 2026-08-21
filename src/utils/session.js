// Sesion de login propia (cookie firmada), sin sumar dependencias nuevas
// (nada de jsonwebtoken/cookie-parser: node:crypto + Set-Cookie a mano
// alcanzan para esto). Se firma con SESSION_SECRET (ver src/config/env.js).
//
// El rescatista necesita poder actuar de inmediato ante una emergencia, sin
// que la sesion se le cierre en el medio: por eso la duracion es larga
// (60 dias) para los tres roles, no solo minutos u horas.

const crypto = require('node:crypto');
const env = require('../config/env');

const COOKIE_NAME = 'pulso_session';
const SESSION_MAX_AGE_SECONDS = 60 * 24 * 60 * 60; // 60 dias

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', env.sessionSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [body, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', env.sessionSecret).update(body).digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function setSessionCookie(res, user) {
  const token = sign({ ...user, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (env.nodeEnv === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  return verify(cookies[COOKIE_NAME]);
}

module.exports = { setSessionCookie, clearSessionCookie, getSessionUser };
