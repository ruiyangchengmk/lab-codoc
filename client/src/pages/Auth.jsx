import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';

function Form({ mode }) {
  const nav = useNavigate();
  const { login, register } = useAuth();
  const [f, setF] = useState({ username: '', password: '', email: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'login') {
        await login(f.username, f.password);
        nav('/');
      } else {
        const r = await register(f.username, f.password, f.email || null);
        setDone(r);
      }
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="auth-card">
        <h1>⏳ Awaiting approval</h1>
        <p>Your registration for <b>{done.id ? 'a new account' : ''}</b> was sent to the admin. You'll be able to sign in once it's approved.</p>
        <p style={{ marginTop: 12 }}><Link to="/login">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>📄 LAB-CODOC</h1>
      <p className="sub">{mode === 'login' ? 'Sign in' : 'Request an account'}</p>
      {mode === 'register' && <p className="warn">⚠ Registration requires admin approval.</p>}
      <form onSubmit={submit}>
        <label>Username<input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} autoFocus required /></label>
        <label>Password<input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required minLength={6} /></label>
        {mode === 'register' && (
          <label>Email <span className="opt">(optional)</span>
            <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
          </label>
        )}
        {err && <div className="err">{err}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? '…' : (mode === 'login' ? 'Sign in' : 'Submit for review')}
        </button>
      </form>
      <p className="foot">
        {mode === 'login'
          ? <>No account? <Link to="/register">Register</Link></>
          : <>Have an account? <Link to="/login">Sign in</Link></>}
      </p>
    </div>
  );
}

export const Login = () => <Form mode="login" />;
export const Register = () => <Form mode="register" />;
