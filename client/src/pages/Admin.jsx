import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '../store/auth';

function Admin() {
  const { user, logout, load } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!user) { nav('/login'); return; }
    if (!user.is_admin) { nav('/'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([api('/auth/pending'), api('/auth/users')]);
      setPending(p); setUsers(u);
    } catch (e) { /* show empty */ }
    finally { setLoading(false); }
  };

  const approve = async (id) => {
    if (!confirm('Approve?')) return;
    await api(`/auth/pending/${id}/approve`, { method: 'POST' });
    fetchAll();
  };
  const reject = async (id) => {
    if (!confirm('Reject?')) return;
    await api(`/auth/pending/${id}/reject`, { method: 'POST' });
    fetchAll();
  };
  const toggle = async (u) => {
    const action = u.status === 'active' ? 'disable' : 'enable';
    if (!confirm(`${action} ${u.username}?`)) return;
    await api(`/auth/users/${u.id}/${action}`, { method: 'POST' });
    fetchAll();
  };

  if (!user) return null;

  return (
    <div>
      <header className="header">
        <div className="logo">⚙️ Admin</div>
        <div style={{ flex: 1 }} />
        <span className="me">{user.username} <span className="badge admin">admin</span></span>
        <button className="btn btn-secondary" onClick={async () => { await logout(); nav('/login'); }}>Sign out</button>
      </header>
      <main className="main">
        <div className="tabs">
          <button className={tab === 'pending' ? 'on' : ''} onClick={() => setTab('pending')}>
            Pending <span className="count">{pending.length}</span>
          </button>
          <button className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>
            Users <span className="count">{users.length}</span>
          </button>
        </div>
        {loading ? <p className="loading">Loading…</p> :
          tab === 'pending' ? (
            pending.length === 0 ? <p className="empty">No pending registrations.</p> :
              pending.map(p => (
                <div className="card" key={p.id}>
                  <div className="row">
                    <b>{p.username}</b>{p.email && <span> · {p.email}</span>}
                    <span className="ts">{new Date(p.requested_at + 'Z').toLocaleString()}</span>
                  </div>
                  {p.password_plain && <details><summary>Password</summary><code>{p.password_plain}</code></details>}
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={() => approve(p.id)}>Approve</button>
                    <button className="btn btn-secondary" onClick={() => reject(p.id)}>Reject</button>
                  </div>
                </div>
              ))
          ) : (
            users.map(u => (
              <div className="card" key={u.id}>
                <div className="row">
                  <b>{u.username}</b>
                  {u.is_admin ? <span className="badge admin">admin</span> : null}
                  {u.status === 'disabled' ? <span className="badge off">disabled</span> : null}
                  {u.email && <span> · {u.email}</span>}
                  <span className="ts">{new Date(u.created_at + 'Z').toLocaleString()}</span>
                </div>
                {!u.is_admin && (
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary" onClick={() => toggle(u)}>
                      {u.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        }
      </main>
    </div>
  );
}

export default Admin;
