import { create } from 'zustand';
import { api } from '../lib/api.js';

const CART_KEY = 'qk_cart_v1';
const loadCart = () => {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(v) ? v.filter((i) => typeof i.productId === 'string' && Number.isInteger(i.qty) && i.qty > 0).slice(0, 50) : [];
  } catch { return []; }
};

let syncTimer = null;
let toastId = 0;

export const useStore = create((set, get) => ({
  // catalogue
  products: [],
  byId: {},
  categories: [],
  catalogStatus: 'idle', // idle | loading | ready | error
  async loadCatalog() {
    const st0 = get().catalogStatus;
    if (st0 === 'loading') return;
    if (st0 !== 'ready') set({ catalogStatus: 'loading' }); // silent refresh once loaded
    try {
      const [{ products }, { categories }] = await Promise.all([api('/products'), api('/products/categories')]);
      set({ products, categories, byId: Object.fromEntries(products.map((p) => [p.id, p])), catalogStatus: 'ready' });
    } catch {
      if (get().catalogStatus !== 'ready') set({ catalogStatus: 'error' });
    }
  },

  // cart: [{ productId, qty }]
  cart: loadCart(),
  flying: [], // product ids currently animating into the 3D cart
  setCart(cart) {
    set({ cart });
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); localStorage.setItem(CART_KEY + '_owner', get().user?.id || 'guest'); } catch { /* ignore */ }
    if (get().user) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(() => api('/auth/cart', { method: 'PUT', body: { items: get().cart } }).catch(() => {}), 600);
    }
  },
  qtyOf: (id) => get().cart.find((i) => i.productId === id)?.qty || 0,
  addToCart(id, qty = 1, { fly = false } = {}) {
    const p = get().byId[id];
    if (!p) return false;
    const cur = get().qtyOf(id);
    const max = Math.min(20, p.stock);
    if (cur >= max) { get().toast(p.stock <= cur ? `Only ${p.stock} in stock` : 'Max 20 per item', 'warn'); return false; }
    const add = Math.min(qty, max - cur);
    const exists = get().cart.some((i) => i.productId === id);
    get().setCart(exists ? get().cart.map((i) => (i.productId === id ? { ...i, qty: i.qty + add } : i)) : [...get().cart, { productId: id, qty: add }]);
    if (fly) {
      const f = Array.from({ length: Math.min(add, 4) }, () => id);
      set({ flying: [...get().flying, ...f] });
      setTimeout(() => {
        const fl = [...get().flying];
        f.forEach((x) => { const i = fl.indexOf(x); if (i >= 0) fl.splice(i, 1); });
        set({ flying: fl });
      }, 750);
    }
    get().toast(`+${add} ${p.name}`, 'ok', p.emoji);
    return true;
  },
  setQty(id, qty) {
    const p = get().byId[id];
    const q = Math.max(0, Math.min(qty, 20, p ? p.stock : 20));
    get().setCart(q === 0 ? get().cart.filter((i) => i.productId !== id) : get().cart.map((i) => (i.productId === id ? { ...i, qty: q } : i)));
  },
  removeFromCart(id) { get().setCart(get().cart.filter((i) => i.productId !== id)); },
  clearCart() { get().setCart([]); },

  // auth
  user: null,
  authChecked: false,
  async fetchMe() {
    try { const { user } = await api('/auth/me'); set({ user, authChecked: true }); if (user) await get().mergeCart(); } catch { set({ authChecked: true }); }
  },
  async mergeCart() {
    const user = get().user;
    if (!user) return;
    try {
      const owner = localStorage.getItem(CART_KEY + '_owner') || 'guest';
      const { items } = await api('/auth/cart');
      let next;
      if (owner === user.id) next = get().cart; // local copy is the freshest
      else if (owner === 'guest') {
        const m = new Map();
        for (const it of [...items, ...get().cart]) m.set(it.productId, Math.min(20, (m.get(it.productId) || 0) + it.qty));
        next = [...m].map(([productId, qty]) => ({ productId, qty }));
      } else next = items; // a different account used this browser
      const byId = get().byId;
      if (Object.keys(byId).length) next = next.filter((i) => byId[i.productId]).map((i) => ({ ...i, qty: Math.min(i.qty, byId[i.productId].stock) })).filter((i) => i.qty > 0);
      get().setCart(next);
    } catch { /* ignore */ }
  },
  setUser(user) { set({ user }); },
  async logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    set({ user: null });
    get().setCart([]);
  },

  // ui
  panel: null, // 'product' | 'checkout' | 'auth' | 'help' | null
  panelArg: null,
  openPanel(panel, panelArg = null) { set({ panel, panelArg }); },
  closePanel() { set({ panel: null, panelArg: null }); },
  authReturn: null,
  requireLogin(returnTo) { set({ panel: 'auth', panelArg: null, authReturn: returnTo }); },
  viewMode: localStorage.getItem('qk_view') || '3d',
  setViewMode(viewMode) { localStorage.setItem('qk_view', viewMode); set({ viewMode }); },
  searchTarget: null, // product id we're guiding to
  setSearchTarget(id) { set({ searchTarget: id }); },
  teleportReq: 0,
  requestTeleport() { set({ teleportReq: get().teleportReq + 1 }); },
  lastOrder: null,
  setLastOrder(o) { set({ lastOrder: o }); },
  checkoutSuppressedUntil: 0,

  toasts: [],
  toast(text, kind = 'ok', icon) {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-2), { id, text, kind, icon }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2200);
  },
}));

export const cartLines = (cart, byId) => cart.map((i) => ({ ...i, product: byId[i.productId] })).filter((l) => l.product)
  .map((l) => ({ ...l, price: l.product.price, mrp: l.product.mrp }));
