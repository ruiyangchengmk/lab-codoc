const express = require('express');
const router = express.Router();
const { DocumentModel, DocumentType } = require('../models/document');
const { exportToExcel, importFromExcel } = require('../../shared/excelUtils');
const { exportToPpt } = require('../../shared/pptUtils');

// Get all documents
router.get('/', (req, res) => {
  try {
    const { type, limit, offset } = req.query;
    const docs = DocumentModel.findAll({
      type,
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    });
    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single document
router.get('/:id', (req, res) => {
  try {
    const doc = DocumentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create document
router.post('/', (req, res) => {
  try {
    const { title, type, content } = req.body;
    
    if (!Object.values(DocumentType).includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: `Invalid type. Must be one of: ${Object.values(DocumentType).join(', ')}` 
      });
    }
    
    const doc = DocumentModel.create({ title, type, content });
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update document
router.put('/:id', (req, res) => {
  try {
    const { title, content } = req.body;
    const doc = DocumentModel.update(req.params.id, { title, content });
    
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    
    // Broadcast update via WebSocket
    const io = req.app.get('io');
    io.to(`doc:${req.params.id}`).emit('document:update', doc);
    
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete document
router.delete('/:id', (req, res) => {
  try {
    DocumentModel.delete(req.params.id);
    
    // Broadcast deletion via WebSocket
    const io = req.app.get('io');
    io.to(`doc:${req.params.id}`).emit('document:delete', { id: req.params.id });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export document (for Excel and PPT)
router.get('/:id/export', async (req, res) => {
  try {
    const doc = DocumentModel.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    let result;
    const filename = `${doc.title || 'document'}.${doc.type === 'excel' ? 'xlsx' : 'pptx'}`;

    if (doc.type === DocumentType.EXCEL) {
      result = await exportToExcel(doc.content);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (doc.type === DocumentType.PPT) {
      result = await exportToPpt(doc.content, doc.title);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    } else {
      return res.status(400).json({ success: false, error: 'Export not supported for markdown' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import Excel
router.post('/import/excel', (req, res) => {
  try {
    const { content } = req.body;
    const data = importFromExcel(content);
    
    const doc = DocumentModel.create({
      title: 'Imported Excel',
      type: DocumentType.EXCEL,
      content: JSON.stringify(data)
    });
    
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get document versions
router.get('/:id/versions', (req, res) => {
  try {
    const versions = DocumentModel.getVersions(req.params.id, {
      limit: parseInt(req.query.limit) || 20
    });
    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
