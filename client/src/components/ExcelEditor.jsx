import React, { useState, useCallback, useEffect, useRef } from 'react';

function SimpleSpreadsheet({ data, onChange }) {
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState(5);

  // Update when data changes
  useEffect(() => {
    if (data && data.length > 0) {
      setRows(data);
      setCols(data[0]?.length || 5);
    }
  }, [data]);

  const updateCell = useCallback((rowIndex, colIndex, value) => {
    setRows(prevRows => {
      const newRows = prevRows.map((row, ri) => 
        ri === rowIndex 
          ? row.map((cell, ci) => ci === colIndex ? value : cell)
          : row
      );
      // Save immediately
      onChange(JSON.stringify(newRows));
      return newRows;
    });
  }, [onChange]);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, Array(cols).fill('')]);
  }, [cols]);

  const addCol = useCallback(() => {
    setCols(c => c + 1);
    setRows(prev => prev.map(row => [...row, '']));
  }, []);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #ddd', background: 'white', display: 'flex', gap: '8px' }}>
        <button className="btn btn-secondary" onClick={addRow} style={{ padding: '4px 10px', fontSize: '12px' }}>
          + Row
        </button>
        <button className="btn btn-secondary" onClick={addCol} style={{ padding: '4px 10px', fontSize: '12px' }}>
          + Column
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        <table style={{ borderCollapse: 'collapse', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '36px', background: '#f8f9fa', border: '1px solid #e0e0e0', padding: '6px', fontSize: '11px', color: '#666' }}>#</th>
              {Array(cols).fill(null).map((_, ci) => (
                <th key={ci} style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', padding: '6px', fontSize: '11px', fontWeight: 500, color: '#666', minWidth: '90px' }}>
                  {String.fromCharCode(65 + ci)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                <td style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', padding: '2px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                  {ri + 1}
                </td>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: '1px solid #e0e0e0', padding: 0 }}>
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                      style={{ width: '100%', border: 'none', padding: '6px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExcelEditor({ content, onChange }) {
  const [data, setData] = useState(null); // null = loading
  const [error, setError] = useState(false);

  // Parse content from parent
  useEffect(() => {
    try {
      const parsed = JSON.parse(content || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Support both array of arrays and {sheets: [{data}]} format
        if (Array.isArray(parsed[0])) {
          setData(parsed);
        } else if (parsed[0]?.data) {
          setData(parsed[0].data);
        } else {
          setData([]);
        }
      } else {
        setData([]);
      }
      setError(false);
    } catch (e) {
      console.error('Failed to parse Excel data:', e);
      setData([]);
      setError(false);
    }
  }, [content]);

  // Loading state
  if (data === null) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
        Loading spreadsheet...
      </div>
    );
  }

  // Show empty state with default grid
  if (data.length === 0) {
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <SimpleSpreadsheet data={Array(10).fill(null).map(() => Array(5).fill(''))} onChange={onChange} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <SimpleSpreadsheet data={data} onChange={onChange} />
    </div>
  );
}

export default ExcelEditor;
