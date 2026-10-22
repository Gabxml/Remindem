import { useState } from 'react';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { authenticate } = useAuth();
  const [mode, setMode] = useState('login');
  const [fields, setFields] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }));
  const isRegister = mode === 'register';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = isRegister ? fields : { email: fields.email, password: fields.password };
      await authenticate(mode, body);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1 className="brand">Reminders</h1>
        <p className="muted">{isRegister ? 'Create your account.' : 'Sign in to see what’s coming up.'}</p>

        {isRegister && (
          <label className="field">Name
            <input value={fields.name} onChange={set('name')} autoComplete="name" required />
          </label>
        )}
        <label className="field">Email
          <input type="email" value={fields.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label className="field">Password
          <input
            type="password"
            value={fields.password}
            onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
            required
          />
          {isRegister && <span className="hint">At least 8 characters.</span>}
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}
        >
          {isRegister ? 'I already have an account' : 'Create an account'}
        </button>
      </form>
    </div>
  );
}
