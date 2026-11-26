import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo, Swatch } from './bits.jsx';
import { useStore, cartLines } from '../state/store.js';
import { computeBill, rupee } from '../lib/bill.js';

function Search() {
  const products = useStore((s) => s.products);
  const viewMode = useStore((s) => s.viewMode);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef();
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return products.filter((p) => `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(t)).slice(0, 7);
  }, [q, products]);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, []);
  const choose = (p, teleport = false) => {
    const st = useStore.getState();
    setOpen(false); setQ('');
    if (viewMode !== '3d') { st.openPanel('product', p.id); return; }
    st.setSearchTarget(p.id);
    if (teleport) st.requestTeleport();
    else st.toast(`Follow the yellow arrows to ${p.name}`, 'info', '🧭');
    document.activeElement?.blur?.();
  };
  return (
    <div className="search" ref={box}>
      <span className="search-ic" aria-hidden="true">🔍</span>
      <input
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) choose(results[0]); if (e.key === 'Escape') setOpen(false); }}
        placeholder='Search "milk", "maggi", "chips"…' aria-label="Search products" maxLength={60}
      />
      <AnimatePresence>
        {open && q.trim() && (
          <motion.ul className="search-results" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {results.length === 0 && <li className="muted pad">No products match “{q}”.</li>}
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" className="sr-main" onClick={() => choose(p)}>
                  <Swatch p={p} size={36} />
                  <span className="grow"><b>{p.name}</b><span className="muted small"> · {p.unit} · Aisle {p.aisle}</span></span>
                  <span className="small">{rupee(p.price)}</span>
                </button>
                {viewMode === '3d' && <button type="button" className="sr-tp" onClick={() => choose(p, true)} title="Teleport to aisle" aria-label={`Teleport to ${p.name}`}>⚡</button>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TopBar() {
  const cart = useStore((s) => s.cart);
  const byId = useStore((s) => s.byId);
  const user = useStore((s) => s.user);
  const viewMode = useStore((s) => s.viewMode);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const lines = cartLines(cart, byId);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const { itemTotal } = computeBill(lines);
  const st = useStore.getState();
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="QuickKart home"><Logo /></Link>
      <div className="badge10" title="Average delivery time"><b>⚡ 10 min</b><span>delivery</span></div>
      <Search />
      <div className="tb-actions">
        <button className="btn icon toggle" onClick={() => st.setViewMode(viewMode === '3d' ? 'list' : '3d')} aria-label={viewMode === '3d' ? 'Switch to list view' : 'Switch to 3D store'} title={viewMode === '3d' ? 'List view' : '3D store'}>
          {viewMode === '3d' ? '☰' : '🧊'}<span className="hide-sm">{viewMode === '3d' ? ' List' : ' 3D'}</span>
        </button>
        <div className="profile">
          {user ? (
            <>
              <button className="btn icon" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Account menu">👤<span className="hide-sm"> {user.name.split(' ')[0]}</span></button>
              <AnimatePresence>
                {menu && (
                  <motion.div className="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)}>
                    <div className="muted small pad">{user.email}</div>
                    <button onClick={() => nav('/orders')}>📦 My Orders</button>
                    {user.role === 'admin' && <button onClick={() => nav('/admin')}>📊 Admin dashboard</button>}
                    <button onClick={() => st.openPanel('help')}>❔ Controls help</button>
                    <button onClick={() => st.logout()}>↩ Log out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <button className="btn icon" onClick={() => st.requireLogin(null)}>👤<span className="hide-sm"> Login</span></button>
          )}
        </div>
        <motion.button key={count} className="cartbtn" onClick={() => st.openPanel('checkout')} initial={{ scale: 0.92 }} animate={{ scale: 1 }} aria-label={`Cart: ${count} items, ${rupee(itemTotal)}`}>
          🛒 {count > 0 ? <span><b>{count} item{count > 1 ? 's' : ''}</b><small>{rupee(itemTotal)}</small></span> : <span><b>My Cart</b></span>}
        </motion.button>
      </div>
    </header>
  );
}
