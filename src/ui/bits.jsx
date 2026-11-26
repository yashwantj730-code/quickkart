import { rupee, discountPct } from '../lib/bill.js';

export const Spinner = ({ size = 28 }) => <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />;

export function Logo({ compact = false }) {
  return (
    <span className="logo" aria-label="QuickKart">
      <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0c831f" />
        <path d="M14 18h6l5 22h20l5-15H23" fill="none" stroke="#ffd60a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="48" r="4" fill="#ffd60a" /><circle cx="43" cy="48" r="4" fill="#ffd60a" />
        <path d="M37 12l-6 11h6l-3 9 9-13h-6l3-7z" fill="#fff" />
      </svg>
      {!compact && <span className="logo-text">quick<b>kart</b></span>}
    </span>
  );
}

export function Price({ p, big = false }) {
  const off = discountPct(p);
  return (
    <span className={`price ${big ? 'big' : ''}`}>
      <b>{rupee(p.price)}</b>
      {p.mrp > p.price && <s>{rupee(p.mrp)}</s>}
      {off > 0 && <em>{off}% OFF</em>}
    </span>
  );
}

export function Swatch({ p, size = 64 }) {
  return (
    <span className="swatch" style={{ width: size, height: size, background: `linear-gradient(145deg, ${p.color}, ${p.color}cc 55%, #ffffff55)`, fontSize: size * 0.5 }} aria-hidden="true">
      {p.emoji || '🛒'}
    </span>
  );
}

export function Stepper({ qty, onDec, onInc, small = false, max }) {
  return (
    <span className={`stepper ${small ? 'small' : ''}`}>
      <button type="button" onClick={onDec} aria-label="Decrease quantity">−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={onInc} aria-label="Increase quantity" disabled={max != null && qty >= max}>+</button>
    </span>
  );
}

export function Empty({ icon = '🛒', title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
