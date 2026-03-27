import React from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import DocumentList from './pages/DocumentList';
import Editor from './pages/Editor';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<DocumentList />} />
        <Route path="/doc/:id" element={<Editor />} />
      </Routes>
    </div>
  );
}

export default App;
