import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { api, useAuth } from '../store/auth';
import MarkdownEditor from '../components/MarkdownEditor';
import ExcelEditor from '../components/ExcelEditor';
import SlideEditor from '../components/SlideEditor';

// socket.io picks up session cookie automatically (server reads lc_session)
const socket = io();

function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const saveTimeoutRef = useRef(null);
  const userIdRef = useRef(`user_${Math.random().toString(36).substr(2, 9)}`);

  // Fetch document on mount
  

  // Socket event handlers
  useEffect(() => { setLoading(true);
    socket.on('sync:state', (state) => {
      setConnectedUsers(state.users || []);
      setCollaborators(state.users || []);
      if (state.content !== undefined) {
        setContent(state.content);
      }
    });

    socket.on('user:join', (user) => {
      setConnectedUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
      toast(`${user.name} joined`, { icon: '👋' });
    });

    socket.on('user:leave', ({ user }) => {
      setConnectedUsers(prev => prev.filter(u => u.id !== user.id));
    });

    socket.on('content:update', ({ content: newContent, userId }) => {
      if (userId !== userIdRef.current) {
        setContent(newContent);
      }
    });

    socket.on('document:update', (doc) => {
      if (doc.id === id && doc.title !== title) {
        setTitle(doc.title);
      }
    });

    socket.on('document:delete', () => {
      toast.success('Document was deleted');
      navigate('/');
    });

    return () => {
      socket.off('sync:state');
      socket.off('user:join');
      socket.off('user:leave');
      socket.off('content:update');
      socket.off('document:update');
      socket.off('document:delete');
    };
  }, []);

  // Auto-save with debounce
  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    
    // Emit to other users immediately
    socket.emit('content:update', { content: newContent });
    
    // Debounce save to server
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api('/documents/' + id, { method: 'PUT', body: JSON.stringify({ content: newContent }) });
        setIsSaving(false);
      } catch (error) {
        toast.error('Failed to save');
        setIsSaving(false);
      }
    }, 1000);
  }, [id]);

  const handleTitleChange = useCallback(async (newTitle) => {
    setTitle(newTitle);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api('/documents/' + id, { method: 'PUT', body: JSON.stringify({ title: newTitle }) });
      } catch (error) {
        toast.error('Failed to save title');
      }
    }, 500);
  }, [id]);

  const handleExport = async () => {
    try {
      // For Markdown, download as .md file directly
      if (doc.type === 'markdown') {
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title || 'document'}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Downloaded!');
        return;
      }

      // For Excel and PPT, use server export
      const response = await fetch(`/api/documents/${id}/export`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = doc.type === 'excel' ? 'xlsx' : 'pptx';
      a.download = `${title || 'document'}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Downloaded!');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (!doc) {
    return (
      <div className="app">
        <header className="header">
          <Link to="/" className="header-logo">📄 LAB-CODOC</Link>
        </header>
        <div className="loading">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="header-logo">📄 LAB-CODOC</Link>
        <nav className="header-nav">
          <Link to="/">← Back to Documents</Link>
        </nav>
        <div style={{ flex: 1 }} />
        <span style={{ marginRight: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
          {user?.display_name || user?.username}
        </span>
        <button
          className="btn btn-secondary"
          onClick={async () => { await logout(); navigate('/login'); }}
        >
          Sign out
        </button>
      </header>

      <div className="editor-container">
        <div className="editor-toolbar">
          <div className="editor-toolbar-left">
            <input
              type="text"
              className="editor-title-input"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Document title"
            />
            <span style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: 600,
              textTransform: 'uppercase',
              background: doc.type === 'markdown' ? '#dbeafe' : 
                         doc.type === 'excel' ? '#dcfce7' : '#fef3c7',
              color: doc.type === 'markdown' ? '#1e40af' :
                     doc.type === 'excel' ? '#166534' : '#92400e'
            }}>
              {doc.type}
            </span>
            {isSaving && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Saving...</span>}
          </div>

          <div className="editor-toolbar-right">
            <div className="collaborators">
              {connectedUsers.slice(0, 5).map((user, i) => (
                <div
                  key={user.id}
                  className="collaborator-avatar"
                  style={{ backgroundColor: user.color || '#3b82f6' }}
                  title={user.name}
                >
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              ))}
              {connectedUsers.length > 5 && (
                <div className="collaborator-avatar" style={{ backgroundColor: '#64748b' }}>
                  +{connectedUsers.length - 5}
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={handleExport}>
              ⬇ Download
            </button>
          </div>
        </div>

        <div className="editor-content">
          {doc.type === 'markdown' && (
            <MarkdownEditor 
              content={content} 
              onChange={handleContentChange} 
            />
          )}
          {doc.type === 'excel' && (
            <ExcelEditor 
              content={content} 
              onChange={handleContentChange} 
            />
          )}
          {doc.type === 'ppt' && (
            <SlideEditor 
              content={content} 
              onChange={handleContentChange} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentEditor;
