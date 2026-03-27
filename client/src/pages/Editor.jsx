import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { useDocumentStore } from '../store/documentStore';
import MarkdownEditor from '../components/MarkdownEditor';
import ExcelEditor from '../components/ExcelEditor';
import SlideEditor from '../components/SlideEditor';

const socket = io();

function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentDocument, fetchDocument, updateDocument, collaborators, setCollaborators } = useDocumentStore();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const saveTimeoutRef = useRef(null);
  const userIdRef = useRef(`user_${Math.random().toString(36).substr(2, 9)}`);

  // Fetch document on mount
  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }
    return () => {
      socket.emit('leave');
    };
  }, [id]);

  // Update local state when document changes
  useEffect(() => {
    if (currentDocument) {
      setTitle(currentDocument.title || '');
      setContent(currentDocument.content || '');
      
      // Join collaboration room
      socket.emit('join', {
        documentId: id,
        user: { id: userIdRef.current, name: `User ${userIdRef.current.slice(-4)}` }
      });
    }
  }, [currentDocument, id]);

  // Socket event handlers
  useEffect(() => {
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
        await updateDocument(id, { content: newContent });
        setIsSaving(false);
      } catch (error) {
        toast.error('Failed to save');
        setIsSaving(false);
      }
    }, 1000);
  }, [id, updateDocument]);

  const handleTitleChange = useCallback(async (newTitle) => {
    setTitle(newTitle);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDocument(id, { title: newTitle });
      } catch (error) {
        toast.error('Failed to save title');
      }
    }, 500);
  }, [id, updateDocument]);

  const handleExport = async () => {
    try {
      // For Markdown, download as .md file directly
      if (currentDocument.type === 'markdown') {
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
      const ext = currentDocument.type === 'excel' ? 'xlsx' : 'pptx';
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

  if (!currentDocument) {
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
              background: currentDocument.type === 'markdown' ? '#dbeafe' : 
                         currentDocument.type === 'excel' ? '#dcfce7' : '#fef3c7',
              color: currentDocument.type === 'markdown' ? '#1e40af' :
                     currentDocument.type === 'excel' ? '#166534' : '#92400e'
            }}>
              {currentDocument.type}
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
          {currentDocument.type === 'markdown' && (
            <MarkdownEditor 
              content={content} 
              onChange={handleContentChange} 
            />
          )}
          {currentDocument.type === 'excel' && (
            <ExcelEditor 
              content={content} 
              onChange={handleContentChange} 
            />
          )}
          {currentDocument.type === 'ppt' && (
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
