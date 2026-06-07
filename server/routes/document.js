// Document CRUD. Two helpers do the heavy lifting: canRead / canWrite.

const express = require('express');
const router = express.Router();
const { DocumentModel, DocumentType } = require('../models/document');
const { exportToExcel, importFromExcel } = require('../../shared/excelUtils');
const { exportToPpt } = require('../../shared/pptUtils');
const { requireAuth } = require('../middleware/auth');

const canRead  = (u, d) => d && (u.is_admin || d.owner_id === u.id);
const canWrite = (u, d) => d && (u.is_admin || d.owner_id === u.id);

// List
router.get('/', requireAuth, (req, res) => {
  const docs = DocumentModel.findAll({
    type: req.query.type || null,
    ownerId: req.user.is_admin ? null : req.user.id,
    limit: parseInt(req.query.limit) || 100,
    offset: parseInt(req.query.offset) || 0,
  });
  res.json({ success: true, data: docs });
});

// Get one
router.get('/:id', requireAuth, (req, res) => {
  const d = DocumentModel.findById(req.params.id);
  if (!canRead(req.user, d)) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, data: d });
});

// Create
router.post('/', requireAuth, (req, res) => {
  const { title, type, content } = req.body || {};
  if (!Object.values(DocumentType).includes(type)) {
    return res.status(400).json({ success: false, error: 'type must be markdown/excel/ppt' });
  }
  const ownerId = (req.user.is_admin && req.body.owner_id) ? req.body.owner_id : req.user.id;
  const d = DocumentModel.create({ title, type, content: content || '', createdBy: req.user.id, ownerId });
  res.status(201).json({ success: true, data: d });
});

// Update
router.put('/:id', requireAuth, (req, res) => {
  const d = DocumentModel.findById(req.params.id);
  if (!canWrite(req.user, d)) return res.status(404).json({ success: false, error: 'not found' });
  const { title, content } = req.body || {};
  const updated = DocumentModel.update(req.params.id, { title, content }, req.user.id);
  req.app.get('io').to(`doc:${req.params.id}`).emit('document:update', updated);
  res.json({ success: true, data: updated });
});

// Delete
router.delete('/:id', requireAuth, (req, res) => {
  const d = DocumentModel.findById(req.params.id);
  if (!canWrite(req.user, d)) return res.status(404).json({ success: false, error: 'not found' });
  DocumentModel.delete(req.params.id);
  req.app.get('io').to(`doc:${req.params.id}`).emit('document:delete', { id: req.params.id });
  res.json({ success: true });
});

// Export
router.get('/:id/export', requireAuth, async (req, res) => {
  const d = DocumentModel.findById(req.params.id);
  if (!canRead(req.user, d)) return res.status(404).json({ success: false, error: 'not found' });
  if (d.type === DocumentType.EXCEL) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${d.title}.xlsx"`);
    res.send(await exportToExcel(d.content));
  } else if (d.type === DocumentType.PPT) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${d.title}.pptx"`);
    res.send(await exportToPpt(d.content, d.title));
  } else {
    res.status(400).json({ success: false, error: 'markdown export not supported' });
  }
});

// Import Excel
router.post('/import/excel', requireAuth, (req, res) => {
  const data = importFromExcel(req.body?.content);
  const d = DocumentModel.create({ title: 'Imported Excel', type: DocumentType.EXCEL, content: JSON.stringify(data), createdBy: req.user.id, ownerId: req.user.id });
  res.status(201).json({ success: true, data: d });
});

// Versions
router.get('/:id/versions', requireAuth, (req, res) => {
  const d = DocumentModel.findById(req.params.id);
  if (!canRead(req.user, d)) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, data: DocumentModel.getVersions(req.params.id, { limit: parseInt(req.query.limit) || 20 }) });
});

module.exports = router;
