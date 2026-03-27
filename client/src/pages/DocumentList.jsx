import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDocumentStore } from '../store/documentStore';

const TYPE_LABELS = {
  markdown: 'Markdown',
  excel: 'Excel',
  ppt: 'PowerPoint'
};

function DocumentList() {
  const { documents, fetchDocuments, createDocument, deleteDocument, isLoading } = useDocumentStore();
  const [showModal, setShowModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', type: 'markdown' });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreate = async () => {
    if (!newDoc.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const doc = await createDocument({
        title: newDoc.title,
        type: newDoc.type,
        content: newDoc.type === 'excel' ? '{"sheets":[{"name":"Sheet1","data":[["","","","",""],["","","","",""],["","","","",""],["","","","",""],["","","","",""]]}]}' : 
                newDoc.type === 'ppt' ? '[{"title":"New Presentation","content":[]}]' : ''
      });
      toast.success('Document created');
      setShowModal(false);
      setNewDoc({ title: '', type: 'markdown' });
      // Navigate to editor
      window.location.href = `/doc/${doc.id}`;
    } catch (error) {
      toast.error('Failed to create document');
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Delete this document?')) return;
    
    try {
      await deleteDocument(id);
      toast.success('Document deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <header className="header">
        <Link to="/" className="header-logo">📄 LAB-CODOC</Link>
        <nav className="header-nav">
          <a href="/">Documents</a>
        </nav>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Document
        </button>
      </header>

      <main className="main">
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h2 style={{ marginBottom: '8px' }}>No documents yet</h2>
            <p>Create your first document to get started</p>
          </div>
        ) : (
          <div className="doc-grid">
            {documents.map(doc => (
              <Link key={doc.id} to={`/doc/${doc.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="doc-card">
                  <span className={`doc-card-type ${doc.type}`}>{TYPE_LABELS[doc.type]}</span>
                  <div className="doc-card-title">{doc.title || 'Untitled'}</div>
                  <div className="doc-card-date">{formatDate(doc.updated_at)}</div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ marginTop: '12px', padding: '4px 8px', fontSize: '12px' }}
                    onClick={(e) => handleDelete(e, doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create New Document</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Title</label>
              <input
                type="text"
                value={newDoc.title}
                onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                placeholder="Enter document title"
                style={{ width: '100%' }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Type</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['markdown', 'excel', 'ppt'].map(type => (
                  <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="docType"
                      value={type}
                      checked={newDoc.type === type}
                      onChange={() => setNewDoc({ ...newDoc, type })}
                    />
                    {TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocumentList;
