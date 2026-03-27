const Y = require('yjs');
const { v4: uuidv4 } = require('uuid');

// Store for Yjs documents and awareness
const docs = new Map();

function getYDoc(documentId) {
  if (!docs.has(documentId)) {
    const doc = new Y.Doc();
    docs.set(documentId, {
      doc,
      awareness: new Map(),
      users: new Map()
    });
  }
  return docs.get(documentId);
}

function setupYjsServer(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    let currentDocId = null;
    let currentUserId = null;

    // Join a document room
    socket.on('join', ({ documentId, user }) => {
      currentDocId = documentId;
      currentUserId = user?.id || uuidv4();
      
      const { doc, users } = getYDoc(documentId);
      const userInfo = {
        id: currentUserId,
        name: user?.name || 'Anonymous',
        color: user?.color || '#3b82f6',
        cursor: null
      };
      
      users.set(socket.id, userInfo);
      socket.join(`doc:${documentId}`);
      
      // Send current document state
      const state = {
        users: Array.from(users.values()),
        content: doc.getText('content').toString()
      };
      socket.emit('sync:state', state);
      
      // Notify others
      socket.to(`doc:${documentId}`).emit('user:join', userInfo);
      
      console.log(`User ${userInfo.name} joined document ${documentId}`);
    });

    // Handle text updates (for non-Yjs fallback or initial sync)
    socket.on('content:update', ({ content }) => {
      if (!currentDocId) return;
      
      const { doc } = getYDoc(currentDocId);
      const yText = doc.getText('content');
      
      doc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, content);
      });
      
      // Broadcast to others in the room
      socket.to(`doc:${currentDocId}`).emit('content:update', { content, userId: currentUserId });
    });

    // Handle Yjs awareness updates (cursor positions, user presence)
    socket.on('awareness:update', (update) => {
      if (!currentDocId) return;
      
      const { awareness, users } = getYDoc(currentDocId);
      const userInfo = users.get(socket.id);
      
      if (userInfo) {
        awareness.set(socket.id, { ...userInfo, ...update });
        
        socket.to(`doc:${currentDocId}`).emit('awareness:update', {
          userId: socket.id,
          update
        });
      }
    });

    // Handle cursor position updates
    socket.on('cursor:move', ({ position }) => {
      if (!currentDocId) return;
      
      const { awareness, users } = getYDoc(currentDocId);
      const userInfo = users.get(socket.id);
      
      if (userInfo) {
        userInfo.cursor = position;
        awareness.set(socket.id, userInfo);
        
        socket.to(`doc:${currentDocId}`).emit('cursor:move', {
          userId: socket.id,
          user: userInfo,
          position
        });
      }
    });

    // Handle document updates from Yjs
    socket.on('yjs:update', (update) => {
      if (!currentDocId) return;
      
      const { doc } = getYDoc(currentDocId);
      Y.applyUpdate(doc, new Uint8Array(update));
      
      // Broadcast to others
      socket.to(`doc:${currentDocId}`).emit('yjs:update', update);
    });

    // Request sync from server
    socket.on('sync:request', () => {
      if (!currentDocId) return;
      
      const { doc } = getYDoc(currentDocId);
      const state = Y.encodeStateAsUpdate(doc);
      socket.emit('yjs:update', Array.from(state));
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentDocId) {
        const { users, awareness } = getYDoc(currentDocId);
        const userInfo = users.get(socket.id);
        
        users.delete(socket.id);
        awareness.delete(socket.id);
        
        if (userInfo) {
          socket.to(`doc:${currentDocId}`).emit('user:leave', {
            userId: socket.id,
            user: userInfo
          });
        }
        
        console.log(`User ${userInfo?.name || socket.id} left document ${currentDocId}`);
        
        // Clean up empty documents after a delay
        setTimeout(() => {
          const { users } = getYDoc(currentDocId);
          if (users.size === 0) {
            docs.delete(currentDocId);
          }
        }, 60000); // Keep for 1 minute in case of reconnection
      }
      
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupYjsServer };
