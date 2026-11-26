import { motion } from 'framer-motion';
import { STATUS_FLOW, STATUS_LABEL } from '../lib/bill.js';

const ICONS = { PLACED: '🧾', PACKED: '📦', OUT_FOR_DELIVERY: '🛵', DELIVERED: '🏠' };

export default function OrderTracker({ order }) {
  if (order.status === 'CANCELLED') return <div className="tracker cancelled">❌ This order was cancelled.</div>;
  const idx = STATUS_FLOW.indexOf(order.status);
  const at = (s) => order.statusHistory?.find((h) => h.status === s)?.at;
  return (
    <ol className="tracker" aria-label="Order status">
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className={i < idx ? 'done' : i === idx ? 'current' : ''}>
          <motion.span className="dot" animate={i === idx && s !== 'DELIVERED' ? { scale: [1, 1.18, 1] } : { scale: 1 }} transition={{ repeat: Infinity, duration: 1.4 }}>{ICONS[s]}</motion.span>
          <span className="lbl">{STATUS_LABEL[s]}</span>
          {at(s) && <span className="when">{new Date(at(s)).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
        </li>
      ))}
    </ol>
  );
}
