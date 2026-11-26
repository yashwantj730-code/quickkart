import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Modal from './Modal.jsx';
import { Swatch, Stepper, Empty, Spinner } from './bits.jsx';
import OrderTracker from './OrderTracker.jsx';
import { useStore, cartLines } from '../state/store.js';
import { computeBill, rupee, FREE_DELIVERY_ABOVE } from '../lib/bill.js';
import { api } from '../lib/api.js';

const blankAddr = { label: 'Home', name: '', phone: '', line1: '', line2: '', landmark: '', city: 'Lucknow', pincode: '' };

function useOrderPolling(orderId, initial) {
  const [order, setOrder] = useState(initial);
  useEffect(() => {
    if (!orderId) return undefined;
    let alive = true;
    const tick = async () => { try { const { order: o } = await api(`/orders/${orderId}`); if (alive) setOrder(o); } catch { /* keep last */ } };
    const t = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [orderId]);
  return order;
}

function Success({ order: initial, onClose }) {
  const order = useOrderPolling(initial.orderId, initial);
  return (
    <div className="success">
      <motion.div className="check" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
        <svg viewBox="0 0 52 52" width="84" height="84"><circle cx="26" cy="26" r="25" fill="#0c831f" /><motion.path d="M14 27l8 8 16-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.5 }} /></svg>
      </motion.div>
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span key={i} className="confetti" style={{ background: i % 2 ? '#ffd60a' : '#0c831f', left: `${50 + (i - 7) * 5}%` }} initial={{ y: 0, opacity: 1 }} animate={{ y: [0, -120 - (i % 4) * 30, 160], x: (i - 7) * 14, opacity: [1, 1, 0], rotate: 360 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
      ))}
      <h2>Order placed!</h2>
      <p className="muted">Order <b>#{order.orderId}</b></p>
      <div className="eta">⚡ Arriving in <b>10 minutes</b></div>
      <OrderTracker order={order} />
      <div className="bill mini"><span>Paid via {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Demo UPI (no real payment)'}</span><b>{rupee(order.bill.total)}</b></div>
      <div className="row gap">
        <Link to={`/orders/${order.orderId}`} className="btn ghost grow" onClick={onClose}>Track in My Orders</Link>
        <button className="btn primary grow" onClick={onClose}>Continue shopping</button>
      </div>
    </div>
  );
}

export default function Checkout() {
  const cart = useStore((s) => s.cart);
  const byId = useStore((s) => s.byId);
  const user = useStore((s) => s.user);
  const lines = useMemo(() => cartLines(cart, byId), [cart, byId]);
  const bill = computeBill(lines);
  const [addr, setAddr] = useState(blankAddr);
  const [addrId, setAddrId] = useState(null);
  const [save, setSave] = useState(true);
  const [pay, setPay] = useState('COD');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [placed, setPlaced] = useState(null);
  const close = () => useStore.getState().closePanel();

  useEffect(() => {
    if (user && !addrId && !addr.line1) {
      if (user.addresses?.length) { setAddrId(user.addresses[0].id); }
      else setAddr((a) => ({ ...a, name: a.name || user.name, phone: a.phone || user.phone || '' }));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = addrId ? user?.addresses?.find((a) => a.id === addrId) : null;
  const st = useStore.getState();

  const place = async () => {
    setErr('');
    if (!user) { st.requireLogin('checkout'); return; }
    const a = chosen || addr;
    if (!chosen) {
      if (!/^[6-9]\d{9}$/.test(a.phone)) return setErr('Enter a valid 10-digit mobile number.');
      if (!/^\d{6}$/.test(a.pincode)) return setErr('Enter a 6-digit pincode.');
      if (a.name.trim().length < 2 || a.line1.trim().length < 3 || a.city.trim().length < 2) return setErr('Please complete the delivery address.');
    }
    setBusy(true);
    try {
      const { id, ...address } = a;
      const { order } = await api('/orders', { method: 'POST', body: { items: cart.map(({ productId, qty }) => ({ productId, qty })), address, saveAddress: !chosen && save, paymentMethod: pay } });
      setPlaced(order);
      st.clearCart();
      st.setLastOrder(order);
      st.loadCatalog(); // refresh stock
      if (!chosen && save) st.fetchMe();
    } catch (e) {
      setErr(e.message);
      if (e.status === 401) st.requireLogin('checkout');
      if (e.status === 409 || e.status === 400) st.loadCatalog();
    } finally { setBusy(false); }
  };

  if (placed) return <Modal onClose={close} label="Order placed" variant="side" className="checkout"><Success order={placed} onClose={close} /></Modal>;

  return (
    <Modal onClose={close} label="Checkout" variant="side" className="checkout">
      <h2 className="panel-title">🛒 My Cart</h2>
      {lines.length === 0 ? (
        <Empty title="Your cart is empty">
          <p className="muted">Walk the aisles and tap products to add them.</p>
          <button className="btn primary" onClick={close}>Start shopping</button>
        </Empty>
      ) : (
        <>
          <div className="eta-strip">⚡ Delivery in <b>10 minutes</b> · {lines.reduce((s, l) => s + l.qty, 0)} items</div>
          <ul className="lines">
            {lines.map((l) => (
              <li key={l.productId}>
                <Swatch p={l.product} size={46} />
                <div className="grow">
                  <div className="lname">{l.product.name}</div>
                  <div className="muted small">{l.product.unit}</div>
                  <div className="small"><b>{rupee(l.price * l.qty)}</b> {l.mrp > l.price && <s className="muted">{rupee(l.mrp * l.qty)}</s>}</div>
                </div>
                <div className="col-end">
                  <Stepper small qty={l.qty} onDec={() => st.setQty(l.productId, l.qty - 1)} onInc={() => st.addToCart(l.productId, 1)} max={Math.min(20, l.product.stock)} />
                  <button className="link danger small" onClick={() => st.removeFromCart(l.productId)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
          {bill.itemTotal < FREE_DELIVERY_ABOVE && <div className="nudge">Add {rupee(FREE_DELIVERY_ABOVE - bill.itemTotal)} more for <b>FREE delivery</b> 🎉</div>}

          <section className="card">
            <h3>Bill details</h3>
            <div className="bill"><span>Items total</span><span>{bill.mrpTotal > bill.itemTotal && <s className="muted">{rupee(bill.mrpTotal)}</s>} {rupee(bill.itemTotal)}</span></div>
            <div className="bill"><span>Delivery fee</span><span>{bill.deliveryFee === 0 ? <><s className="muted">₹25</s> <b className="green">FREE</b></> : rupee(bill.deliveryFee)}</span></div>
            <div className="bill"><span>Handling fee</span><span>{rupee(bill.handlingFee)}</span></div>
            <div className="bill total"><span>Grand total</span><span>{rupee(bill.total)}</span></div>
            {bill.savings > 0 && <div className="savings">🎉 You save {rupee(bill.savings)} on this order</div>}
          </section>

          <section className="card">
            <h3>Delivery address</h3>
            {!user && <p className="muted small">Log in to use saved addresses.</p>}
            {user?.addresses?.length > 0 && (
              <div className="addr-list">
                {user.addresses.map((a) => (
                  <label key={a.id} className={`addr ${addrId === a.id ? 'on' : ''}`}>
                    <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrId(a.id)} />
                    <span><b>{a.label}</b> · {a.name}<br /><span className="muted small">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}</span></span>
                  </label>
                ))}
                <label className={`addr ${!addrId ? 'on' : ''}`}><input type="radio" name="addr" checked={!addrId} onChange={() => setAddrId(null)} /><span>＋ Add a new address</span></label>
              </div>
            )}
            {!chosen && (
              <div className="form grid2">
                <label>Save as<select value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })}><option>Home</option><option>Work</option><option>Other</option></select></label>
                <label>Name<input value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} maxLength={60} autoComplete="name" /></label>
                <label>Mobile<input inputMode="numeric" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value.replace(/\D/g, '') })} maxLength={10} autoComplete="tel" /></label>
                <label>Pincode<input inputMode="numeric" value={addr.pincode} onChange={(e) => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, '') })} maxLength={6} autoComplete="postal-code" /></label>
                <label className="span2">House / flat, street<input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} maxLength={120} autoComplete="address-line1" /></label>
                <label>Area (optional)<input value={addr.line2} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} maxLength={120} autoComplete="address-line2" /></label>
                <label>Landmark (optional)<input value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} maxLength={80} /></label>
                <label className="span2">City<input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} maxLength={60} autoComplete="address-level2" /></label>
                {user && <label className="check span2"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this address</label>}
              </div>
            )}
          </section>

          <section className="card">
            <h3>Payment</h3>
            <label className={`pay ${pay === 'COD' ? 'on' : ''}`}><input type="radio" name="pay" checked={pay === 'COD'} onChange={() => setPay('COD')} /> 💵 Cash on Delivery</label>
            <label className={`pay ${pay === 'DEMO_UPI' ? 'on' : ''}`}><input type="radio" name="pay" checked={pay === 'DEMO_UPI'} onChange={() => setPay('DEMO_UPI')} /> 📱 Demo UPI <span className="tag">DEMO · no real payment</span></label>
          </section>

          {err && <p className="error" role="alert">{err}</p>}
          <div className="sticky-cta">
            <div><b>{rupee(bill.total)}</b><div className="muted small">TOTAL</div></div>
            <button className="btn primary grow" onClick={place} disabled={busy}>{busy ? <Spinner size={18} /> : user ? 'Place order →' : 'Log in to place order'}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
