import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Modal from './Modal.jsx';
import { Logo, Spinner } from './bits.jsx';
import { api } from '../lib/api.js';
import { useStore } from '../state/store.js';

export default function AuthModal() {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => useStore.getState().closePanel();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pwIssues = mode === 'register' ? [
    f.password.length < 8 && '8+ characters', !/[A-Z]/.test(f.password) && 'an uppercase letter',
    !/[a-z]/.test(f.password) && 'a lowercase letter', !/\d/.test(f.password) && 'a number',
  ].filter(Boolean) : [];

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (mode === 'register' && pwIssues.length) { setErr(`Password needs ${pwIssues.join(', ')}.`); return; }
    setBusy(true);
    try {
      const body = mode === 'login' ? { email: f.email, password: f.password } : f;
      const { user } = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body });
      const st = useStore.getState();
      st.setUser(user);
      await st.mergeCart();
      st.toast(`Welcome${mode === 'register' ? '' : ' back'}, ${user.name.split(' ')[0]}!`, 'ok', '👋');
      const ret = st.authReturn;
      useStore.setState({ authReturn: null });
      if (ret === 'checkout') st.openPanel('checkout'); else st.closePanel();
    } catch (ex) {
      setErr(ex.message);
    } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      <Modal onClose={close} label={mode === 'login' ? 'Log in' : 'Create account'} className="auth">
        <div className="auth-head"><Logo /><p>{mode === 'login' ? 'Log in to place orders and track deliveries.' : 'Create your QuickKart account.'}</p></div>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>Log in</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>Sign up</button>
        </div>
        <form onSubmit={submit} className="form" noValidate>
          {mode === 'register' && (
            <>
              <label>Full name<input required autoComplete="name" value={f.name} onChange={set('name')} maxLength={60} /></label>
              <label>Mobile number<input required inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" value={f.phone} onChange={set('phone')} maxLength={10} /></label>
            </>
          )}
          <label>Email<input required type="email" autoComplete="email" value={f.email} onChange={set('email')} maxLength={120} /></label>
          <label>Password<input required type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} maxLength={72} /></label>
          {mode === 'register' && f.password && pwIssues.length > 0 && <p className="hint">Needs {pwIssues.join(', ')}.</p>}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn primary block" disabled={busy}>{busy ? <Spinner size={18} /> : mode === 'login' ? 'Log in' : 'Create account'}</button>
          {mode === 'login' && (
            <button type="button" className="btn ghost block" onClick={() => setF({ ...f, email: 'demo@quickkart.dev', password: 'Demo@1234' })}>
              Use demo account (demo@quickkart.dev)
            </button>
          )}
        </form>
      </Modal>
    </AnimatePresence>
  );
}
