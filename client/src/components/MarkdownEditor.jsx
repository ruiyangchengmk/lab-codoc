import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { marked } from 'marked';

function MarkdownEditor({ content, onChange }) {
  const [view, setView] = useState('split'); // 'edit' | 'preview' | 'split'

  const handleEditorChange = useCallback((value) => {
    onChange(value || '');
  }, [onChange]);

  const getMonacoLanguage = () => 'markdown';

  const editor = (
    <div style={{ height: '100%', display: view !== 'preview' ? 'block' : 'none' }}>
      <Editor
        height="100%"
        language={getMonacoLanguage()}
        value={content}
        onChange={handleEditorChange}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 }
        }}
      />
    </div>
  );

  const preview = (
    <div 
      style={{ 
        height: '100%', 
        overflow: 'auto', 
        padding: '20px 40px',
        background: '#fafafa',
        display: view !== 'edit' ? 'block' : 'none'
      }}
    >
      <div 
        style={{ 
          maxWidth: '800px', 
          margin: '0 auto', 
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
        dangerouslySetInnerHTML={{ __html: marked(content || '') }}
      />
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '8px 20px', 
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: '8px',
        background: 'var(--bg-secondary)'
      }}>
        <button 
          className={`btn ${view === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setView('edit')}
          style={{ padding: '4px 12px', fontSize: '12px' }}
        >
          Edit
        </button>
        <button 
          className={`btn ${view === 'split' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setView('split')}
          style={{ padding: '4px 12px', fontSize: '12px' }}
        >
          Split
        </button>
        <button 
          className={`btn ${view === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setView('preview')}
          style={{ padding: '4px 12px', fontSize: '12px' }}
        >
          Preview
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {view === 'split' ? (
          <>
            <div style={{ width: '50%', borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
              {editor}
            </div>
            <div style={{ width: '50%', overflow: 'hidden' }}>
              {preview}
            </div>
          </>
        ) : (
          <>
            {editor}
            {preview}
          </>
        )}
      </div>
    </div>
  );
}

export default MarkdownEditor;
