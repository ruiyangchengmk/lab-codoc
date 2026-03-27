import React, { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_SLIDE = {
  id: Date.now(),
  title: 'Untitled',
  background: '#ffffff',
  blocks: []
};

function SlideEditor({ content, onChange }) {
  const [slides, setSlides] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const canvasRef = useRef(null);

  // Parse content
  useEffect(() => {
    if (content === undefined || content === null) return;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSlides(parsed.map(s => ({ ...DEFAULT_SLIDE, ...s, blocks: s.blocks || [] })));
        setCurrentIndex(0);
      } else {
        setSlides([{ ...DEFAULT_SLIDE }]);
      }
    } catch {
      setSlides([{ ...DEFAULT_SLIDE }]);
    }
  }, [content]);

  const currentSlide = slides && slides[currentIndex] ? slides[currentIndex] : null;

  const saveSlides = useCallback((newSlides) => {
    setSlides(newSlides);
    onChange(JSON.stringify(newSlides));
  }, [onChange]);

  const addSlide = useCallback(() => {
    const newSlide = { ...DEFAULT_SLIDE, id: Date.now() };
    const newSlides = [...(slides || []), newSlide];
    saveSlides(newSlides);
    setCurrentIndex(newSlides.length - 1);
  }, [slides, saveSlides]);

  const deleteSlide = useCallback(() => {
    if (!slides || slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== currentIndex);
    saveSlides(newSlides);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  }, [slides, currentIndex, saveSlides]);

  const updateSlideTitle = useCallback((title) => {
    if (!currentSlide) return;
    const newSlides = slides.map((s, i) => i === currentIndex ? { ...s, title } : s);
    saveSlides(newSlides);
  }, [slides, currentIndex, saveSlides]);

  const addTextBlock = useCallback(() => {
    if (!currentSlide) return;
    const newBlock = {
      id: Date.now(),
      type: 'text',
      x: 50,
      y: 100,
      w: 300,
      text: 'Double-click to edit',
      fontSize: 24,
      color: '#333333'
    };
    const newSlides = slides.map((s, i) => 
      i === currentIndex ? { ...s, blocks: [...(s.blocks || []), newBlock] } : s
    );
    saveSlides(newSlides);
    setSelectedBlock(newBlock.id);
  }, [slides, currentIndex, saveSlides]);

  const addImageBlock = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!currentSlide) return;
        const newBlock = {
          id: Date.now(),
          type: 'image',
          x: 50,
          y: 100,
          w: 200,
          h: 150,
          src: ev.target.result
        };
        const newSlides = slides.map((s, i) => 
          i === currentIndex ? { ...s, blocks: [...(s.blocks || []), newBlock] } : s
        );
        saveSlides(newSlides);
        setSelectedBlock(newBlock.id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [slides, currentIndex, saveSlides, currentSlide]);

  const updateBlock = useCallback((blockId, updates) => {
    if (!currentSlide) return;
    const newSlides = slides.map((s, i) => 
      i === currentIndex ? {
        ...s,
        blocks: s.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
      } : s
    );
    saveSlides(newSlides);
    if (selectedBlock === blockId) {
      setSelectedBlock(null);
    }
  }, [slides, currentIndex, saveSlides, selectedBlock]);

  const deleteBlock = useCallback((blockId) => {
    if (!currentSlide) return;
    const newSlides = slides.map((s, i) => 
      i === currentIndex ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s
    );
    saveSlides(newSlides);
    setSelectedBlock(null);
  }, [slides, currentIndex, saveSlides]);

  const handleDragStart = useCallback((blockId, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const block = currentSlide?.blocks.find(b => b.id === blockId);
    if (!block) return;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      updateBlock(blockId, {
        x: Math.max(0, block.x + dx),
        y: Math.max(0, block.y + dy)
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [currentSlide, updateBlock]);

  const handleDoubleClick = useCallback((blockId) => {
    const block = currentSlide?.blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'text') return;
    
    const newText = prompt('Edit text:', block.text);
    if (newText !== null) {
      updateBlock(blockId, { text: newText });
    }
  }, [currentSlide, updateBlock]);

  // Loading
  if (slides === null) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f5f5f5' }}>
      {/* Left sidebar - slide list */}
      <div style={{ width: '140px', background: '#fff', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 600, fontSize: '12px', color: '#666' }}>
          Slides ({slides.length})
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              onClick={() => setCurrentIndex(i)}
              style={{
                width: '100%',
                aspectRatio: '16/9',
                background: slide.background || '#fff',
                borderRadius: '4px',
                marginBottom: '6px',
                cursor: 'pointer',
                border: i === currentIndex ? '2px solid #3b82f6' : '2px solid transparent',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2px 4px', fontSize: '8px', color: '#666', background: 'rgba(255,255,255,0.9)' }}>
                {slide.title || `Slide ${i+1}`}
              </div>
            </div>
          ))}
          <button
            onClick={addSlide}
            style={{ width: '100%', padding: '6px', border: '2px dashed #ccc', borderRadius: '4px', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: '#666' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Main editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={currentSlide?.title || ''}
            onChange={(e) => updateSlideTitle(e.target.value)}
            placeholder="Slide title"
            style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', width: '150px', fontSize: '13px' }}
          />
          <div style={{ width: '1px', height: '20px', background: '#ddd' }} />
          <button onClick={addTextBlock} style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            + Text
          </button>
          <button onClick={addImageBlock} style={{ padding: '4px 10px', background: '#f1f5f9', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
            + Image
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={deleteSlide} style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>
            Delete Slide
          </button>
        </div>

        {/* Canvas */}
        <div ref={canvasRef} style={{ flex: 1, overflow: 'auto', padding: '20px', background: '#e5e7eb', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '100%',
            maxWidth: '800px',
            aspectRatio: '16/9',
            background: currentSlide?.background || '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Title */}
            <div style={{
              position: 'absolute',
              top: '30px',
              left: '30px',
              right: '30px',
              fontSize: '28px',
              fontWeight: 700,
              color: '#1e293b'
            }}>
              {currentSlide?.title || 'Untitled'}
            </div>

            {/* Blocks */}
            {(currentSlide?.blocks || []).map((block) => (
              <div
                key={block.id}
                onMouseDown={(e) => block.type === 'text' && handleDragStart(block.id, e)}
                onDoubleClick={() => handleDoubleClick(block.id)}
                style={{
                  position: 'absolute',
                  left: block.x,
                  top: block.y,
                  width: block.type === 'text' ? 'auto' : block.w,
                  minWidth: block.type === 'text' ? '100px' : undefined,
                  height: block.type === 'image' ? block.h : 'auto',
                  cursor: block.type === 'text' ? 'move' : 'default',
                  border: selectedBlock === block.id ? '2px solid #3b82f6' : 'none',
                  borderRadius: '4px',
                  padding: block.type === 'text' ? '4px 8px' : 0,
                  background: block.type === 'text' ? 'rgba(255,255,255,0.9)' : 'transparent'
                }}
              >
                {block.type === 'text' && (
                  <div style={{
                    fontSize: block.fontSize || 24,
                    color: block.color || '#333',
                    whiteSpace: 'nowrap'
                  }}>
                    {block.text}
                  </div>
                )}
                {block.type === 'image' && (
                  <img src={block.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                )}
                {selectedBlock === block.id && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-28px', 
                    right: 0, 
                    background: '#fff', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    padding: '2px 6px',
                    display: 'flex',
                    gap: '4px',
                    fontSize: '11px'
                  }}>
                    <input
                      type="number"
                      value={block.fontSize || 24}
                      onChange={(e) => updateBlock(block.id, { fontSize: parseInt(e.target.value) || 24 })}
                      style={{ width: '50px', padding: '2px', border: '1px solid #ddd', borderRadius: '2px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} style={{ color: '#dc2626', cursor: 'pointer' }}>×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: '#888', background: '#fff', borderTop: '1px solid #ddd' }}>
          Drag text to move • Double-click to edit • Click block to select and resize
        </div>
      </div>
    </div>
  );
}

export default SlideEditor;
