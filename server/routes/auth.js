// All auth + admin routes in one file. Public vs. protected with the helpers.

const express = require('express');
const router = express.Router();
const { User, Pending } = require('../models/user');
const { issueCookie, clearCookie, requireAuth, requireAdmin } = require('../middleware/auth');

const NAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function publicUser(u) {
  return { id: u.id, username: u.username, display_name: u.display_name, is_admin: !!u.is_admin };
}

// ---------- Public ----------

// POST /api/auth/register — write to pending, fire-and-forget notify
router.post('/register', (req, res) => {
  const { username, password, email, display_name } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, error: 'username + password required' });
  if (!NAME_RE.test(username)) return res.status(400).json({ success: false, error: 'username must be 3-20 chars (a-z 0-9 _)' });
  if (password.length < 6) return res.status(400).json({ success: false, error: 'password must be ≥6 chars' });
  if (User.byUsername(username)) return res.status(409).json({ success: false, error: 'username taken' });
  const dup = getDb().prepare('SELECT 1 FROM pending_registrations WHERE username = ?').get(username);
  if (dup) return res.status(409).json({ success: false, error: 'registration already pending' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const p = Pending.create({ username, password, email, displayName: display_name, ip });
  notifyAdmin(p).catch(() => {}); // fire-and-forget; admin panel is the source of truth
  res.status(201).json({ success: true, data: { id: p.id, message: 'pending admin approval' } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, error: 'username + password required' });
  const u = User.authenticate(username, password);
  if (!u) return res.status(401).json({ success: false, error: 'invalid credentials' });
  issueCookie(res, u);
  res.json({ success: true, data: publicUser(u) });
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearCookie(res);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const u = User.byId(req.user.id);
  res.json({ success: true, data: u ? publicUser(u) : null });
});

// ---------- Admin only ----------

// GET /api/admin/pending
router.get('/pending', requireAuth, requireAdmin, (_req, res) => {
  res.json({ success: true, data: Pending.list() });
});

// POST /api/admin/pending/:id/approve  → move to users
router.post('/pending/:id/approve', requireAuth, requireAdmin, (req, res) => {
  const p = Pending.byId(req.params.id);
  if (!p) return res.status(404).json({ success: false, error: 'not found' });
  if (User.byUsername(p.username)) return res.status(409).json({ success: false, error: 'username already exists' });
  const u = User.create({ username: p.username, password: p.password_plain, email: p.email, displayName: p.display_name, isAdmin: 0 });
  Pending.remove(p.id);
  res.json({ success: true, data: publicUser(u) });
});

// POST /api/admin/pending/:id/reject
router.post('/pending/:id/reject', requireAuth, requireAdmin, (req, res) => {
  Pending.remove(req.params.id);
  res.json({ success: true });
});

// GET /api/admin/users
router.get('/users', requireAuth, requireAdmin, (_req, res) => {
  res.json({ success: true, data: User.list() });
});

// POST /api/admin/users/:id/{disable,enable}
function setStatus(req, res, status) {
  const u = User.byId(req.params.id);
  if (!u) return res.status(404).json({ success: false, error: 'not found' });
  if (u.is_admin) return res.status(400).json({ success: false, error: 'cannot change admin status' });
  User.setStatus(u.id, status);
  res.json({ success: true });
}
router.post('/users/:id/disable', requireAuth, requireAdmin, (req, res) => setStatus(req, res, 'disabled'));
router.post('/users/:id/enable',  requireAuth, requireAdmin, (req, res) => setStatus(req, res, 'active'));

// ---------- helpers ----------

function getDb() { return require('../models/db').getDb(); }

async function notifyAdmin(p) {
  // Tries HERMES_GATEWAY_URL then FEISHU_WEBHOOK_URL, then console. Non-fatal.
  const msg = `🆕 New registration\n• ${p.username}` + (p.email ? ` <${p.email}>` : '') + `\n• id: ${p.id}`;
  if (process.env.HERMES_GATEWAY_URL) {
    await postJson(process.env.HERMES_GATEWAY_URL, { message: msg });
  } else if (process.env.FEISHU_WEBHOOK_URL) {
    await postJson(process.env.FEISHU_WEBHOOK_URL, { msg_type: 'text', content: { text: msg } });
  } else {
    console.log('[notify]', msg);
  }
}
function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? require('https') : require('http');
    const data = JSON.stringify(body);
    const req = lib.request({ method: 'POST', hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, timeout: 4000 },
      (r) => { r.resume(); r.on('end', () => r.statusCode < 300 ? resolve() : reject(new Error('HTTP ' + r.statusCode))); });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('timeout'))); req.write(data); req.end();
  });
}

module.exports = router;
