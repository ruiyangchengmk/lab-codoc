const { getDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

const DocumentType = {
  MARKDOWN: 'markdown',
  EXCEL: 'excel',
  PPT: 'ppt'
};

class DocumentModel {
  static create({ title = 'Untitled', type = DocumentType.MARKDOWN, content = '', createdBy = 'anonymous' }) {
    const db = getDb();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO documents (id, title, type, content, created_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, title, type, content, createdBy);
    return this.findById(id);
  }

  static findById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ? AND is_deleted = 0');
    return stmt.get(id);
  }

  static findAll({ type = null, limit = 100, offset = 0 } = {}) {
    const db = getDb();
    let sql = 'SELECT * FROM documents WHERE is_deleted = 0';
    const params = [];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  static update(id, { title, content }) {
    const db = getDb();
    
    // Save version before updating
    const doc = this.findById(id);
    if (doc && content !== undefined) {
      this.saveVersion(id, doc.content, 'anonymous');
    }
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    
    if (updates.length === 0) return doc;
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    const sql = `UPDATE documents SET ${updates.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...params);
    
    return this.findById(id);
  }

  static delete(id) {
    const db = getDb();
    const stmt = db.prepare('UPDATE documents SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    return stmt.run(id);
  }

  static saveVersion(documentId, content, createdBy = 'anonymous') {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO document_versions (document_id, content, created_by)
      VALUES (?, ?, ?)
    `);
    return stmt.run(documentId, content, createdBy);
  }

  static getVersions(documentId, { limit = 20 } = {}) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM document_versions 
      WHERE document_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(documentId, limit);
  }
}

module.exports = { DocumentModel, DocumentType };
