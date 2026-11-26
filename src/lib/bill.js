// Display-only mirror of server/lib/bill.js. The server recalculates everything.
export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_ABOVE = 199;
export const HANDLING_FEE = 4;

export function computeBill(lines) {
  const itemTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const mrpTotal = lines.reduce((s, l) => s + Math.max(l.mrp, l.price) * l.qty, 0);
  const deliveryFee = itemTotal === 0 || itemTotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const handlingFee = itemTotal === 0 ? 0 : HANDLING_FEE;
  const savings = mrpTotal - itemTotal + (itemTotal > 0 && deliveryFee === 0 ? DELIVERY_FEE : 0);
  return { itemTotal, mrpTotal, deliveryFee, handlingFee, savings, total: itemTotal + deliveryFee + handlingFee };
}

export const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const discountPct = (p) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0);

export const STATUS_FLOW = ['PLACED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
export const STATUS_LABEL = { PLACED: 'Placed', PACKED: 'Packed', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };
