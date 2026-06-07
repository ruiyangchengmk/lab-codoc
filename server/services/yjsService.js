const Y = require('yjs');
const { DocumentModel } = require('../models/document');
const { User } = require('../models/user');
const { verify } = require('../middleware/auth');

const docs = new Map();

function getYDoc(documentId) {
  if (!docs.has(documentId)) {
    const doc = new Y.Doc();
    docs.set(documentId, { doc, users: new Map() });
  }
  return docs.get(documentId);
}

function setupYjsServer(io) {
  io.use((socket, next) => {
    // Read session cookie from the upgrade request (socket.io forwards it).
    const cookieHeader = socket.handshake.headers.cookie || '';
    const m = cookieHeader.match(/(?:^|;\s*)lc_session=([^;]+)/);
    const token = m ? m[1] : null;
    const payload = verify(token);
    if (!payload) return next(new Error('unauthorized'));
    const u = User.byId(payload.uid);
    if (!u) return next(new Error('unauthorized'));
    socket.user = u;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`WS connect ${socket.id} (user=${socket.user.username})`);
    let currentDocId = null;
    let currentUserId = socket.user.id;

    socket.on('join', ({ documentId }) => {
      const d = DocumentModel.findById(documentId);
      const u = socket.user;
      if (!d || !(u.is_admin || d.owner_id === u.id)) {
        socket.emit('join:error', { error: 'no access' });
        return;
      }
      currentDocId = documentId;
      const slot = getYDoc(documentId);
      const userInfo = { id: u.id, name: u.display_name || u.username, color: '#3b82f6', is_admin: !!u.is_admin, cursor: null };
      slot.users.set(socket.id, userInfo);
      socket.join('doc:' + documentId);
      socket.emit('sync:state', { users: Array.from(slot.users.values()), content: slot.doc.getText('content').toString(), read_only: !(u.is_admin || d.owner_id === u.id) });
      socket.to('doc:' + documentId).emit('user:join', userInfo);
    });

    function writable() {
      if (!currentDocId) return false;
      const d = DocumentModel.findById(currentDocId);
      return d && (socket.user.is_admin || d.owner_id === socket.user.id);
    }

    socket.on('content:update', ({ content }) => {
      if (!writable()) return;
      const slot = getYDoc(currentDocId);
      const t = slot.doc.getText('content');
      slot.doc.transact(() => { t.delete(0, t.length); t.insert(0, content); });
      socket.to('doc:' + currentDocId).emit('content:update', { content, userId: currentUserId });
    });
    socket.on('awareness:update', (update) => {
      if (!currentDocId) return;
      const slot = getYDoc(currentDocId);
      const ui = slot.users.get(socket.id);
      if (ui) slot.users.set(socket.id, { ...ui, ...update });
      socket.to('doc:' + currentDocId).emit('awareness:update', { userId: socket.id, update });
    });
    socket.on('cursor:move', ({ position }) => {
      if (!currentDocId) return;
      const slot = getYDoc(currentDocId);
      const ui = slot.users.get(socket.id);
      if (ui) { ui.cursor = position; slot.users.set(socket.id, ui); }
      socket.to('doc:' + currentDocId).emit('cursor:move', { userId: socket.id, user: ui, position });
    });
    socket.on('yjs:update', (update) => {
      if (!writable()) return;
      const slot = getYDoc(currentDocId);
      Y.applyUpdate(slot.doc, new Uint8Array(update));
      socket.to('doc:' + currentDocId).emit('yjs:update', update);
    });
    socket.on('sync:request', () => {
      if (!currentDocId) return;
      socket.emit('yjs:update', Array.from(Y.encodeStateAsUpdate(getYDoc(currentDocId).doc)));
    });

    socket.on('disconnect', () => {
      if (currentDocId) {
        const slot = getYDoc(currentDocId);
        const ui = slot.users.get(socket.id);
        slot.users.delete(socket.id);
        if (ui) socket.to('doc:' + currentDocId).emit('user:leave', { userId: socket.id, user: ui });
        setTimeout(() => {
          if (slot.users.size === 0) docs.delete(currentDocId);
        }, 60_000);
      }
    });
  });
}

module.exports = { setupYjsServer };

