import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import DocumentList from './pages/DocumentList';
import Editor from './pages/Editor';
import { Login, Register } from './pages/Auth';
import Admin from './pages/Admin';
import { useAuth } from './store/auth';

function Guard({ children, adminOnly = false }) {
  const { user, loaded, load } = useAuth();
  const loc = useLocation();
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);
  if (!loaded) return <p className="loading">Loading…</p>;
  if (!user) return <Navigate to={'/login?next=' + encodeURIComponent(loc.pathname)} replace />;
  if (adminOnly && !user.is_admin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Guard><DocumentList /></Guard>} />
      <Route path="/doc/:id" element={<Guard><Editor /></Guard>} />
      <Route path="/admin" element={<Guard adminOnly><Admin /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
