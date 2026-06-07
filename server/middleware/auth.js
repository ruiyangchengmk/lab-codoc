// Auth middleware: parse session cookie → verify → inject req.user
// Pattern borrowed from NextAuth.js: signed httpOnly cookie carries the session.
// Stateless: no DB session table; JWT in cookie IS the session.

const crypto = require('crypto');

const SECRET = process.env.LABCODOC_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'lc_session';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function b64urlDecode(s) {
  return Buffer.from(s, 'base64url');
}
function sign(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch (e) { return null; }
}

function issueCookie(res, user) {
  const token = sign({
    uid: user.id,
    username: user.username,
    is_admin: !!user.is_admin,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: MAX_AGE * 1000,
  });
  return token;
}

function clearCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = verify(token);
  if (payload) {
    req.user = {
      id: payload.uid,
      username: payload.username,
      is_admin: !!payload.is_admin,
    };
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ success: false, error: 'Admin only' });
  next();
}

module.exports = { authMiddleware, requireAuth, requireAdmin, issueCookie, clearCookie, verify };
