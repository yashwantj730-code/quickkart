import { useState } from 'react';
import Modal from './Modal.jsx';
import { Price, Swatch, Stepper } from './bits.jsx';
import { useStore } from '../state/store.js';
import { launchFly } from '../three/playerState.js';
import { CAT_STYLE } from '../three/layout.js';

export default function ProductCard({ id }) {
  const p = useStore((s) => s.byId[id]);
  const inCart = useStore((s) => s.cart.find((i) => i.productId === id)?.qty || 0);
  const viewMode = useStore((s) => s.viewMode);
  const [qty, setQty] = useState(1);
  const close = () => useStore.getState().closePanel();
  if (!p) return null;
  const cat = CAT_STYLE[p.category];
  const max = Math.min(20, p.stock) - inCart;
  const out = p.stock <= 0;

  const add = () => {
    const st = useStore.getState();
    const n = Math.min(qty, max);
    if (n <= 0) return;
    if (viewMode === '3d') launchFly(p.id, p.color, n);
    st.addToCart(p.id, n, { fly: viewMode === '3d' });
    setQty(1);
    if (viewMode === '3d') setTimeout(close, 250);
  };

  return (
    <Modal onClose={close} label={p.name} variant="side" className="product-card">
      <div className="pc-hero" style={{ background: `radial-gradient(circle at 30% 20%, #fff8, transparent 60%), ${p.color}22` }}>
        <Swatch p={p} size={112} />
        <span className="chip" style={{ background: cat?.color }}>{cat?.label} · Aisle {p.aisle}</span>
      </div>
      <div className="pc-body">
        <p className="muted small">{p.brand}</p>
        <h2>{p.name}</h2>
        <p className="muted">{p.unit}</p>
        <Price p={p} big />
        <p className={`stock ${p.stock <= 5 ? 'low' : ''}`}>
          {out ? 'Out of stock' : p.stock <= 5 ? `Hurry, only ${p.stock} left!` : `In stock · ${p.stock} available`}
        </p>
        {inCart > 0 && <p className="incart">✓ {inCart} in your cart</p>}
        <div className="pc-actions">
          <Stepper qty={qty} onDec={() => setQty(Math.max(1, qty - 1))} onInc={() => setQty(Math.min(Math.max(1, max), qty + 1))} max={Math.max(1, max)} />
          <button className="btn primary grow" onClick={add} disabled={out || max <= 0}>
            {out ? 'Out of stock' : max <= 0 ? 'Max in cart' : `Add to cart · ₹${p.price * Math.min(qty, Math.max(1, max))}`}
          </button>
        </div>
        <p className="muted small center">⚡ Delivered in 10 minutes</p>
      </div>
    </Modal>
  );
}
