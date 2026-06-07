// User & pending-registration data access. Tiny — one prepared-statement-per-method.

const { getDb } = require('./db');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');

function hash(pw) {
  // PBKDF2 — stdlib, no native deps. 100k iterations is fine for lab-scale.
  const salt = crypto.randomBytes(16);
  const h = crypto.pbkdf2Sync(pw, salt, 100_000, 32, 'sha256');
  return `${salt.toString('hex')}.${h.toString('hex')}`;
}
function verify(pw, stored) {
  if (!stored || !stored.includes('.')) return false;
  const [salt, h] = stored.split('.');
  const test = crypto.pbkdf2Sync(pw, Buffer.from(salt, 'hex'), 100_000, 32, 'sha256');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), test);
}

const User = {
  byId: (id) => getDb().prepare('SELECT id, username, email, display_name, is_admin, status, password_hash FROM users WHERE id = ?').get(id),
  byUsername: (u) => getDb().prepare('SELECT id, username, email, display_name, is_admin, status, password_hash FROM users WHERE username = ?').get(u),
  create: ({ username, password, email = null, displayName = null, isAdmin = 0 }) => {
    const id = uuid();
    getDb().prepare(`
      INSERT INTO users (id, username, password_hash, email, display_name, is_admin, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(id, username, hash(password), email, displayName || username, isAdmin ? 1 : 0);
    return User.byId(id);
  },
  count: () => getDb().prepare('SELECT COUNT(*) AS n FROM users').get().n,
  list: () => getDb().prepare('SELECT id, username, email, display_name, is_admin, status, created_at FROM users ORDER BY created_at DESC').all(),
  setStatus: (id, status) => getDb().prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id),
  touch: (id) => getDb().prepare("UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(id),
  // Returns null if password wrong, user object on success.
  authenticate: (username, password) => {
    const u = User.byUsername(username);
    if (!u || u.status !== 'active') return null;
    if (!verify(password, u.password_hash)) return null;
    User.touch(u.id);
    return u;
  },
};

const Pending = {
  create: ({ username, password, email = null, displayName = null, ip = null }) => {
    const id = uuid();
    getDb().prepare(`
      INSERT INTO pending_registrations (id, username, password_plain, email, display_name, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, username, password, email, displayName, ip);
    return Pending.byId(id);
  },
  byId: (id) => getDb().prepare('SELECT id, username, email, display_name, ip_address, requested_at, password_plain FROM pending_registrations WHERE id = ?').get(id),
  list: () => getDb().prepare('SELECT id, username, email, display_name, ip_address, requested_at, password_plain FROM pending_registrations ORDER BY requested_at DESC').all(),
  remove: (id) => getDb().prepare('DELETE FROM pending_registrations WHERE id = ?').run(id),
};

module.exports = { User, Pending };
