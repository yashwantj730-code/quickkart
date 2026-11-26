import { useEffect, useState, useCallback } from 'react';
import { NavLink, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useStore } from '../state/store.js';
import { api } from '../lib/api.js';
import { rupee, STATUS_LABEL } from '../lib/bill.js';
import { Logo, Spinner, Empty } from '../ui/bits.jsx';
import Modal from '../ui/Modal.jsx';
import { CAT_STYLE } from '../three/layout.js';
import './admin.css';

const STATUSES = ['PLACED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();

function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, err: '', loading: true });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    api(path).then((data) => setState({ data, err: '', loading: false })).catch((e) => setState({ data: null, err: e.message, loading: false }));
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: load };
}

function Pager({ page, total, limit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pager">
      <button className="btn ghost sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
      <span className="muted small">Page {page} of {pages} · {total} total</span>
      <button className="btn ghost sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
    </div>
  );
}

function Kpi({ icon, label, value, tone }) {
  return (
    <motion.div className={`kpi ${tone || ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <span className="kpi-ic">{icon}</span>
      <div><div className="kpi-v">{value}</div><div className="muted small">{label}</div></div>
    </motion.div>
  );
}

function Dashboard() {
  const { data, err, loading } = useApi('/admin/stats');
  const low = useApi('/admin/products?status=low&limit=8');
  if (loading && !data) return <div className="center-page"><Spinner /></div>;
  if (err) return <Empty icon="⚠️" title="Couldn’t load stats"><p className="muted">{err}</p></Empty>;
  const { kpis, days, categories } = data;
  return (
    <div className="adm-page">
      <h1>Dashboard</h1>
      <div className="kpis">
        <Kpi icon="🧾" label="Today's orders" value={kpis.todayOrders} />
        <Kpi icon="💰" label="Today's revenue" value={rupee(kpis.todayRevenue)} tone="green" />
        <Kpi icon="👥" label="Customers" value={kpis.users} />
        <Kpi icon="⚠️" label="Low-stock items" value={kpis.lowStock} tone={kpis.lowStock ? 'warn' : ''} />
      </div>
      <div className="charts">
        <section className="card">
          <h3>Revenue · last 7 days <span className="muted small">({rupee(kpis.weekRevenue)})</span></h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={days} margin={{ left: -10, right: 8, top: 8 }}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0c831f" stopOpacity={0.5} /><stop offset="100%" stopColor="#0c831f" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} />
              <Tooltip formatter={(v) => rupee(v)} /><Area type="monotone" dataKey="revenue" stroke="#0c831f" fill="url(#g)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
        <section className="card">
          <h3>Orders · last 7 days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={days} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="label" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} />
              <Tooltip /><Bar dataKey="orders" fill="#f9c600" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="card">
          <h3>Sales by category</h3>
          {categories.every((c) => !c.sales) ? <p className="muted">No sales yet this week.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categories.filter((c) => c.sales)} dataKey="sales" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={categories.filter((c) => c.sales).length > 1 ? 2 : 0}>
                  {categories.filter((c) => c.sales).map((c) => <Cell key={c.id} fill={CAT_STYLE[c.id]?.color} />)}
                </Pie>
                <Tooltip formatter={(v) => rupee(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <ul className="legend">{categories.map((c) => <li key={c.id}><i style={{ background: CAT_STYLE[c.id]?.color }} />{c.name}<b>{rupee(c.sales)}</b></li>)}</ul>
        </section>
        <section className="card">
          <h3>⚠️ Low-stock alerts</h3>
          {low.data?.items?.length ? (
            <ul className="lowlist">{low.data.items.map((p) => <li key={p.id}><span>{p.emoji} {p.name}</span><span className={`pill ${p.stock === 0 ? 'red' : 'amber'}`}>{p.stock} left</span></li>)}</ul>
          ) : <p className="muted">All products are well stocked.</p>}
          <Link to="/admin/products?status=low" className="link small">Manage stock →</Link>
        </section>
      </div>
    </div>
  );
}

const blankProduct = { name: '', brand: '', category: 'snacks', unit: '', price: 0, mrp: 0, stock: 0, color: '#22c55e', shape: 'box', emoji: '🛒', aisle: 'A2', shelf: 0, slot: 0, active: true };

function ProductForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState(initial || blankProduct);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, num) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : num ? Number(e.target.value) : e.target.value });
  const save = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    const body = { name: f.name, brand: f.brand, category: f.category, unit: f.unit, price: f.price, mrp: f.mrp, stock: f.stock, color: f.color, shape: f.shape, emoji: f.emoji, aisle: f.aisle, shelf: f.shelf, slot: f.slot, active: f.active };
    try {
      if (initial?.id) await api(`/admin/products/${initial.id}`, { method: 'PATCH', body });
      else await api('/admin/products', { method: 'POST', body });
      onSaved();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  return (
    <Modal onClose={onClose} label="Product" variant="side">
      <h2 className="panel-title">{initial?.id ? 'Edit product' : 'New product'}</h2>
      <form className="form grid2" onSubmit={save}>
        <label className="span2">Name<input required value={f.name} onChange={set('name')} maxLength={120} /></label>
        <label>Brand<input value={f.brand} onChange={set('brand')} maxLength={60} /></label>
        <label>Unit / weight<input value={f.unit} onChange={set('unit')} maxLength={40} placeholder="500 g" /></label>
        <label>Category<select value={f.category} onChange={set('category')}>{Object.entries(CAT_STYLE).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}</select></label>
        <label>Aisle<input value={f.aisle} onChange={set('aisle')} maxLength={10} /></label>
        <label>Price (₹)<input type="number" min="0" step="0.5" value={f.price} onChange={set('price', true)} /></label>
        <label>MRP (₹)<input type="number" min="0" step="0.5" value={f.mrp} onChange={set('mrp', true)} /></label>
        <label>Stock<input type="number" min="0" step="1" value={f.stock} onChange={set('stock', true)} /></label>
        <label>Shelf slot<input type="number" min="0" max="200" value={f.slot} onChange={set('slot', true)} /></label>
        <label>Pack colour<input type="color" value={f.color} onChange={set('color')} /></label>
        <label>Shape<select value={f.shape} onChange={set('shape')}>{['box', 'pack', 'bag', 'bottle', 'can', 'jar', 'tub', 'fruit'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Emoji<input value={f.emoji} onChange={set('emoji')} maxLength={8} /></label>
        <label className="check"><input type="checkbox" checked={f.active} onChange={set('active')} /> Active (visible in store)</label>
        {err && <p className="error span2">{err}</p>}
        <button className="btn primary span2" disabled={busy}>{busy ? <Spinner size={18} /> : 'Save product'}</button>
      </form>
    </Modal>
  );
}

function Products() {
  const init = new URLSearchParams(window.location.search);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState(init.get('status') || '');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);
  const [debQ, setDebQ] = useState('');
  useEffect(() => { const t = setTimeout(() => { setDebQ(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, err, loading, reload } = useApi(`/admin/products?${qs({ q: debQ, category: cat, status, page, limit: 12 })}`);
  const toast = useStore((s) => s.toast);
  const toggle = async (p) => { try { await api(`/admin/products/${p.id}`, { method: 'PATCH', body: { active: !p.active } }); reload(); } catch (e) { toast(e.message, 'warn'); } };
  const del = async (p) => { if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return; try { await api(`/admin/products/${p.id}`, { method: 'DELETE' }); toast('Product deleted', 'info'); reload(); } catch (e) { toast(e.message, 'warn'); } };
  return (
    <div className="adm-page">
      <div className="adm-head"><h1>Products</h1><button className="btn primary" onClick={() => setEdit({})}>＋ Add product</button></div>
      <div className="filters">
        <input placeholder="Search name or brand" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} aria-label="Search products" />
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} aria-label="Category"><option value="">All categories</option>{Object.entries(CAT_STYLE).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}</select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="low">Low stock (≤10)</option></select>
      </div>
      {err && <p className="error">{err}</p>}
      {loading && !data ? <Spinner /> : data && (
        <>
          {data.items.length === 0 ? <Empty icon="📦" title="No products match" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>MRP</th><th>Stock</th><th>Aisle</th><th>Active</th><th /></tr></thead>
                <tbody>
                  {data.items.map((p) => (
                    <tr key={p.id} className={p.active ? '' : 'dim'}>
                      <td data-l="Product"><span className="pdot" style={{ background: p.color }}>{p.emoji}</span> <b>{p.name}</b><div className="muted small">{p.brand} · {p.unit}</div></td>
                      <td data-l="Category">{CAT_STYLE[p.category]?.label}</td>
                      <td data-l="Price">{rupee(p.price)}</td>
                      <td data-l="MRP">{rupee(p.mrp)}</td>
                      <td data-l="Stock"><span className={`pill ${p.stock === 0 ? 'red' : p.stock <= 10 ? 'amber' : 'green'}`}>{p.stock}</span></td>
                      <td data-l="Aisle">{p.aisle}</td>
                      <td data-l="Active"><label className="switch"><input type="checkbox" checked={p.active} onChange={() => toggle(p)} aria-label={`Active: ${p.name}`} /><span /></label></td>
                      <td className="actions"><button className="btn ghost sm" onClick={() => setEdit(p)}>Edit</button><button className="btn ghost sm danger" onClick={() => del(p)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={page} total={data.total} limit={12} onPage={setPage} />
        </>
      )}
      <AnimatePresence>{edit && <ProductForm initial={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); toast('Product saved', 'ok', '✅'); useStore.getState().loadCatalog(); }} />}</AnimatePresence>
    </div>
  );
}

function OrderDrawer({ orderId, onClose, onChanged }) {
  const { data, err, reload } = useApi(`/admin/orders/${orderId}`);
  const toast = useStore((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const setStatus = async (status) => {
    setBusy(true);
    try { await api(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } }); toast(`Status → ${STATUS_LABEL[status]}`, 'ok'); reload(); onChanged(); } catch (e) { toast(e.message, 'warn'); } finally { setBusy(false); }
  };
  const o = data?.order;
  return (
    <Modal onClose={onClose} label="Order detail" variant="side">
      {err && <p className="error">{err}</p>}
      {!o ? <Spinner /> : (
        <div>
          <h2 className="panel-title">#{o.orderId}</h2>
          <p className="muted small">{new Date(o.createdAt).toLocaleString('en-IN')} · {o.userName} ({o.userEmail})</p>
          <label className="form">Status
            <select value={o.status} disabled={busy || o.status === 'CANCELLED'} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          </label>
          <p className="muted small">Changing status stops auto-advance and updates the customer’s tracker.</p>
          <ul className="lines compact">{o.items.map((i) => <li key={i.productId}><span className="emoji">{i.emoji}</span><span className="grow">{i.name} × {i.qty}</span><b>{rupee(i.price * i.qty)}</b></li>)}</ul>
          <div className="bill total"><span>Total ({o.paymentMethod === 'COD' ? 'COD' : 'Demo UPI'})</span><span>{rupee(o.bill.total)}</span></div>
          <p className="small"><b>{o.address.name}</b>, {o.address.phone}<br />{o.address.line1}, {o.address.city} {o.address.pincode}</p>
          <h3>Timeline</h3>
          <ul className="timeline">{o.statusHistory.map((h, i) => <li key={i}>{STATUS_LABEL[h.status]} <span className="muted small">{new Date(h.at).toLocaleTimeString('en-IN')}</span></li>)}</ul>
        </div>
      )}
    </Modal>
  );
}

function Orders() {
  const [f, setF] = useState({ status: '', q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [debQ, setDebQ] = useState('');
  useEffect(() => { const t = setTimeout(() => { setDebQ(f.q); setPage(1); }, 300); return () => clearTimeout(t); }, [f.q]);
  const filt = { status: f.status, q: debQ, from: f.from, to: f.to ? `${f.to}T23:59:59` : '' };
  const { data, err, loading, reload } = useApi(`/admin/orders?${qs({ ...filt, page, limit: 15 })}`);
  return (
    <div className="adm-page">
      <div className="adm-head"><h1>Orders</h1><a className="btn ghost" href={`/api/admin/orders.csv?${qs(filt)}`} download>⬇ Export CSV</a></div>
      <div className="filters">
        <input placeholder="Order ID or email" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} maxLength={60} aria-label="Search orders" />
        <select value={f.status} onChange={(e) => { setF({ ...f, status: e.target.value }); setPage(1); }} aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <input type="date" value={f.from} onChange={(e) => { setF({ ...f, from: e.target.value }); setPage(1); }} aria-label="From date" />
        <input type="date" value={f.to} onChange={(e) => { setF({ ...f, to: e.target.value }); setPage(1); }} aria-label="To date" />
      </div>
      {err && <p className="error">{err}</p>}
      {loading && !data ? <Spinner /> : data && (
        <>
          {data.items.length === 0 ? <Empty icon="🧾" title="No orders found" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {data.items.map((o) => (
                    <tr key={o.orderId}>
                      <td data-l="Order"><b>#{o.orderId}</b><div className="muted small">{new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div></td>
                      <td data-l="Customer">{o.userName}<div className="muted small">{o.userEmail}</div></td>
                      <td data-l="Items">{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                      <td data-l="Total">{rupee(o.bill.total)}</td>
                      <td data-l="Payment">{o.paymentMethod === 'COD' ? 'COD' : 'Demo UPI'}</td>
                      <td data-l="Status"><span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span></td>
                      <td className="actions"><button className="btn ghost sm" onClick={() => setOpen(o.orderId)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={page} total={data.total} limit={15} onPage={setPage} />
        </>
      )}
      <AnimatePresence>{open && <OrderDrawer orderId={open} onClose={() => setOpen(null)} onChanged={reload} />}</AnimatePresence>
    </div>
  );
}

function Users() {
  const [q, setQ] = useState('');
  const [debQ, setDebQ] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDebQ(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  const { data, err, loading, reload } = useApi(`/admin/users?${qs({ q: debQ, page, limit: 15 })}`);
  const toast = useStore((s) => s.toast);
  const block = async (u) => { try { await api(`/admin/users/${u.id}/block`, { method: 'PATCH', body: { blocked: !u.blocked } }); toast(u.blocked ? 'User unblocked' : 'User blocked', 'info'); reload(); } catch (e) { toast(e.message, 'warn'); } };
  return (
    <div className="adm-page">
      <h1>Users</h1>
      <div className="filters"><input placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} aria-label="Search users" /></div>
      {err && <p className="error">{err}</p>}
      {loading && !data ? <Spinner /> : data && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className={u.blocked ? 'dim' : ''}>
                    <td data-l="Name"><b>{u.name}</b></td><td data-l="Email">{u.email}</td><td data-l="Phone">{u.phone}</td>
                    <td data-l="Role"><span className={`pill ${u.role === 'admin' ? 'amber' : ''}`}>{u.role}</span></td>
                    <td data-l="Joined">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td data-l="Status">{u.blocked ? <span className="pill red">Blocked</span> : <span className="pill green">Active</span>}</td>
                    <td className="actions">{u.role !== 'admin' && <button className={`btn ghost sm ${u.blocked ? '' : 'danger'}`} onClick={() => block(u)}>{u.blocked ? 'Unblock' : 'Block'}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={data.total} limit={15} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default function AdminApp() {
  const user = useStore((s) => s.user);
  const checked = useStore((s) => s.authChecked);
  if (!checked) return <div className="center-page"><Spinner /></div>;
  if (!user || user.role !== 'admin') {
    return (
      <div className="center-page">
        <Empty icon="🔒" title="Admins only">
          <p className="muted">{user ? 'Your account does not have admin access.' : 'Log in with an admin account to continue.'}</p>
          <div className="row gap">{!user && <button className="btn primary" onClick={() => useStore.getState().requireLogin(null)}>Log in</button>}<Link className="btn ghost" to="/">Back to store</Link></div>
        </Empty>
      </div>
    );
  }
  return (
    <div className="admin">
      <aside className="adm-nav">
        <Link to="/" className="brand"><Logo /><span className="adm-tag">Admin</span></Link>
        <nav>
          <NavLink end to="/admin">📊 <span>Dashboard</span></NavLink>
          <NavLink to="/admin/products">📦 <span>Products</span></NavLink>
          <NavLink to="/admin/orders">🧾 <span>Orders</span></NavLink>
          <NavLink to="/admin/users">👥 <span>Users</span></NavLink>
        </nav>
        <Link to="/" className="back hide-sm">← Back to store</Link>
      </aside>
      <main className="adm-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="users" element={<Users />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
