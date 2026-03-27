const PptxGenJS = require('pptxgenjs');

/**
 * Export slides data to PowerPoint
 * @param {string|Array} content - JSON string or array of slide objects
 * @param {string} title - Document title
 * @returns {Buffer} PowerPoint file buffer
 */
function exportToPpt(content, title = 'Untitled Presentation') {
  let slides;
  
  if (typeof content === 'string') {
    slides = JSON.parse(content);
  } else if (Array.isArray(content)) {
    slides = content;
  } else if (content.slides) {
    slides = content.slides;
  } else {
    slides = [content];
  }

  const pptx = new PptxGenJS();
  pptx.title = title;
  pptx.author = 'LAB-CODOC';

  slides.forEach((slideData, index) => {
    const slide = pptx.addSlide();
    
    // Set background if specified
    if (slideData.background) {
      slide.background = { color: slideData.background };
    }

    // Add title
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: 0.5,
        y: 0.3,
        w: '90%',
        h: 0.8,
        fontSize: 36,
        bold: true,
        color: slideData.titleColor || '333333'
      });
    }

    // Add content blocks
    const contentBlocks = slideData.content || slideData.blocks || [];
    let yOffset = slideData.title ? 1.3 : 0.5;

    contentBlocks.forEach(block => {
      if (block.type === 'text' || !block.type) {
        slide.addText(block.text || '', {
          x: block.x || 0.5,
          y: block.y || yOffset,
          w: block.w || '90%',
          h: block.h || 0.5,
          fontSize: block.fontSize || 18,
          color: block.color || '000000',
          bold: block.bold || false,
          italic: block.italic || false
        });
        yOffset += (block.h || 0.5) + 0.1;
      } else if (block.type === 'image') {
        slide.addImage({
          data: block.data,
          x: block.x || 1,
          y: block.y || yOffset,
          w: block.w || 6,
          h: block.h || 4
        });
        yOffset += (block.h || 4) + 0.2;
      } else if (block.type === 'shape') {
        slide.addShape(block.shape || 'rect', {
          x: block.x || 0.5,
          y: block.y || yOffset,
          w: block.w || 5,
          h: block.h || 2,
          fill: { color: block.fill || 'CCCCCC' },
          line: { color: block.line || '000000', width: block.lineWidth || 1 }
        });
        yOffset += (block.h || 2) + 0.2;
      }
    });

    // Add slide number
    slide.addText(`${index + 1} / ${slides.length}`, {
      x: '90%',
      y: '95%',
      w: '8%',
      h: 0.3,
      fontSize: 10,
      color: '888888',
      align: 'right'
    });
  });

  return pptx.writeBuffer();
}

/**
 * Create a blank slide template
 * @returns {Array} Array with one blank slide
 */
function createBlankPpt() {
  return JSON.stringify([
    {
      title: 'Title',
      background: 'FFFFFF',
      content: [
        { type: 'text', text: 'Click to add text', fontSize: 24, color: 'CCCCCC' }
      ]
    }
  ]);
}

/**
 * Parse PPTX to JSON slides (basic)
 * @param {Buffer} buffer - PowerPoint file buffer
 * @returns {Array} Array of slide objects
 */
function importFromPpt(buffer) {
  // For now, return blank structure
  // Full PPT import requires more complex XML parsing
  return [{ title: 'Imported Slide', content: [] }];
}

module.exports = {
  exportToPpt,
  createBlankPpt,
  importFromPpt
};
