import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, useAuth } from '../store/auth';

const TYPE_LABELS = { markdown: 'Markdown', excel: 'Excel', ppt: 'PowerPoint' };

function DocumentList() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', type: 'markdown' });

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try { setDocs(await api('/documents')); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newDoc.title.trim()) return toast.error('Title required');
    try {
      const content = newDoc.type === 'excel' ? '{"sheets":[{"name":"Sheet1","data":[["","","","",""]]}]}'
                   : newDoc.type === 'ppt' ? '[{"title":"New","content":[]}]' : '';
      const doc = await api('/documents', { method: 'POST', body: JSON.stringify({ title: newDoc.title, type: newDoc.type, content }) });
      toast.success('Created');
      setShowModal(false);
      setNewDoc({ title: '', type: 'markdown' });
      window.location.href = '/doc/' + doc.id;
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete?')) return;
    try {
      await api('/documents/' + id, { method: 'DELETE' });
      setDocs(docs.filter(d => d.id !== id));
      toast.success('Deleted');
    } catch (e) { toast.error(e.message); }
  };

  const fmt = (s) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <header className="header">
        <Link to="/" className="logo">📄 LAB-CODOC</Link>
        <nav className="nav">
          <a href="/">Documents</a>
          {user && user.is_admin && <a href="/admin">Admin</a>}
        </nav>
        <div style={{ flex: 1 }} />
        <span className="me">{user && (user.display_name || user.username)}</span>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New</button>
        <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={async () => { await logout(); nav('/login'); }}>Sign out</button>
      </header>

      <main className="main">
        {loading ? <p className="loading">Loading…</p> :
          docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48 }}>📝</div>
              <h2>No documents yet</h2>
              <p>Click "+ New" to start</p>
            </div>
          ) : (
            <div className="grid">
              {docs.map(d => (
                <Link key={d.id} to={'/doc/' + d.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card">
                    <span className={'pill ' + d.type}>{TYPE_LABELS[d.type]}</span>
                    <div className="title">{d.title || 'Untitled'}</div>
                    <div className="ts">{fmt(d.updated_at)}</div>
                    <button className="btn btn-secondary" style={{ marginTop: 8, padding: '4px 8px', fontSize: 12 }} onClick={(e) => handleDelete(e, d.id)}>Delete</button>
                  </div>
                </Link>
              ))}
            </div>
          )
        }
      </main>

      {showModal && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New document</h2>
            <label>Title<input value={newDoc.title} onChange={e => setNewDoc({ ...newDoc, title: e.target.value })} autoFocus /></label>
            <label>Type
              <div className="row">
                {['markdown', 'excel', 'ppt'].map(t => (
                  <label key={t} className="radio"><input type="radio" name="t" value={t} checked={newDoc.type === t} onChange={() => setNewDoc({ ...newDoc, type: t })} /> {TYPE_LABELS[t]}</label>
                ))}
              </div>
            </label>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
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

