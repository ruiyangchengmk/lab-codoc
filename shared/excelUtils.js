const XLSX = require('xlsx');

/**
 * Export JSON data to Excel buffer
 * @param {string|object} content - JSON string or object representing spreadsheet data
 * @returns {Buffer} Excel file buffer
 */
function exportToExcel(content) {
  let data;
  
  if (typeof content === 'string') {
    data = JSON.parse(content);
  } else {
    data = content;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // If data is an array of sheets
  if (Array.isArray(data)) {
    data.forEach((sheet, index) => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data || sheet);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name || `Sheet${index + 1}`);
    });
  } else if (typeof data === 'object' && data !== null) {
    // Single sheet or object with sheets property
    const sheets = data.sheets || [data];
    sheets.forEach((sheet, index) => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data || sheet);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name || `Sheet${index + 1}`);
    });
  }

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

/**
 * Import Excel file and return JSON
 * @param {Buffer|string} content - Excel file buffer or base64 string
 * @returns {Array} Array of sheet objects with name and data
 */
function importFromExcel(content) {
  let buffer = content;
  
  if (typeof content === 'string') {
    // Assume base64 encoded
    buffer = Buffer.from(content, 'base64');
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  const result = workbook.SheetNames.map(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return {
      name: sheetName,
      data: data
    };
  });

  return result;
}

/**
 * Create a blank Excel template
 * @param {string} name - Sheet name
 * @returns {string} JSON string for the sheet
 */
function createBlankExcel(name = 'Sheet1') {
  return JSON.stringify({
    sheets: [{
      name,
      data: [
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', '']
      ]
    }]
  });
}

module.exports = {
  exportToExcel,
  importFromExcel,
  createBlankExcel
};
