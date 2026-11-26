import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Price, Swatch, Stepper, Empty } from './bits.jsx';
import { useStore } from '../state/store.js';
import { CAT_STYLE } from '../three/layout.js';

function Tile({ p }) {
  const qty = useStore((s) => s.cart.find((i) => i.productId === p.id)?.qty || 0);
  const st = useStore.getState();
  return (
    <motion.div className="tile" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <button className="tile-img" onClick={() => st.openPanel('product', p.id)} aria-label={`View ${p.name}`}><Swatch p={p} size={72} /></button>
      <div className="tile-eta">⚡ 10 MINS</div>
      <div className="tile-name">{p.name}</div>
      <div className="muted small">{p.unit}</div>
      <div className="tile-foot">
        <Price p={p} />
        {p.stock <= 0 ? <span className="muted small">Sold out</span>
          : qty > 0 ? <Stepper small qty={qty} onDec={() => st.setQty(p.id, qty - 1)} onInc={() => st.addToCart(p.id, 1)} max={Math.min(20, p.stock)} />
            : <button className="btn add" onClick={() => st.addToCart(p.id, 1)}>ADD</button>}
      </div>
    </motion.div>
  );
}

export default function ListView({ notice }) {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [cat, setCat] = useState('all');
  const groups = useMemo(() => categories.map((c) => ({ ...c, items: products.filter((p) => p.category === c.id) })).filter((g) => g.items.length && (cat === 'all' || g.id === cat)), [products, categories, cat]);
  return (
    <main className="listview">
      {notice && <div className="notice">{notice}</div>}
      <nav className="cats" aria-label="Categories">
        <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>🛒 All</button>
        {categories.map((c) => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{CAT_STYLE[c.id]?.icon} {c.name}</button>)}
      </nav>
      {groups.length === 0 && <Empty title="No products yet" />}
      {groups.map((g) => (
        <section key={g.id}>
          <h2 className="cat-title">{CAT_STYLE[g.id]?.icon} {g.name} <span className="muted small">· Aisle {g.aisle}</span></h2>
          <div className="tiles">{g.items.map((p) => <Tile key={p.id} p={p} />)}</div>
        </section>
      ))}
    </main>
  );
}
