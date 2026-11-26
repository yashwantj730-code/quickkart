// Bill rules (shared logic mirrored in src/lib/bill.js for display only; the server is the source of truth).
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

export const STATUSES = ['PLACED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
