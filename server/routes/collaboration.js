// Collaboration routes - handles user presence and awareness
// Most real-time collaboration is handled via WebSocket (yjsService)
// This file provides REST endpoints for collaboration metadata

const express = require('express');
const router = express.Router();

// Get active users for a document (via socket.io rooms)
// This is primarily handled via WebSocket, but we provide REST fallback

router.get('/:documentId/users', (req, res) => {
  // Users are managed via socket.io rooms
  // The client should use the socket connection to get real-time user list
  // This endpoint is a placeholder for potential future REST-based presence
  res.json({ 
    success: true, 
    message: 'Use WebSocket for real-time user presence',
    documentId: req.params.documentId 
  });
});

module.exports = router;
