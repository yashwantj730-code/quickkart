import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopBar from './TopBar.jsx';
import OrderTracker from './OrderTracker.jsx';
import { Empty, Spinner } from './bits.jsx';
import { api } from '../lib/api.js';
import { rupee, STATUS_LABEL } from '../lib/bill.js';
import { useStore } from '../state/store.js';

function OrderDetail({ orderId }) {
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    const load = () => api(`/orders/${orderId}`).then(({ order: o }) => alive && setOrder(o)).catch((e) => alive && setErr(e.message));
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [orderId]);
  if (err) return <Empty icon="🔎" title="Order not found"><Link className="btn ghost" to="/orders">Back to orders</Link></Empty>;
  if (!order) return <div className="center-page"><Spinner /></div>;
  const cancel = async () => {
    try { const { order: o } = await api(`/orders/${order.orderId}/cancel`, { method: 'POST' }); setOrder(o); useStore.getState().toast('Order cancelled', 'info'); useStore.getState().loadCatalog(); } catch (e) { useStore.getState().toast(e.message, 'warn'); }
  };
  return (
    <motion.div className="order-detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Link to="/orders" className="link">← All orders</Link>
      <h1>Order #{order.orderId}</h1>
      <p className="muted">{new Date(order.createdAt).toLocaleString('en-IN')} · {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Demo UPI'}</p>
      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && <div className="eta">⚡ Arriving in about 10 minutes</div>}
      <OrderTracker order={order} />
      <section className="card">
        <h3>{order.items.length} items</h3>
        <ul className="lines compact">
          {order.items.map((i) => <li key={i.productId}><span className="emoji">{i.emoji}</span><span className="grow">{i.name} <span className="muted small">{i.unit} × {i.qty}</span></span><b>{rupee(i.price * i.qty)}</b></li>)}
        </ul>
        <div className="bill"><span>Items total</span><span>{rupee(order.bill.itemTotal)}</span></div>
        <div className="bill"><span>Delivery fee</span><span>{order.bill.deliveryFee ? rupee(order.bill.deliveryFee) : 'FREE'}</span></div>
        <div className="bill"><span>Handling fee</span><span>{rupee(order.bill.handlingFee)}</span></div>
        <div className="bill total"><span>Total</span><span>{rupee(order.bill.total)}</span></div>
        {order.bill.savings > 0 && <div className="savings">You saved {rupee(order.bill.savings)}</div>}
      </section>
      <section className="card">
        <h3>Delivering to</h3>
        <p><b>{order.address.label}</b> · {order.address.name}, {order.address.phone}<br /><span className="muted">{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}{order.address.landmark ? ` (near ${order.address.landmark})` : ''}, {order.address.city} - {order.address.pincode}</span></p>
      </section>
      {order.status === 'PLACED' && <button className="btn ghost danger" onClick={cancel}>Cancel order</button>}
    </motion.div>
  );
}

export default function OrdersPage() {
  const { orderId } = useParams();
  const user = useStore((s) => s.user);
  const checked = useStore((s) => s.authChecked);
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!user || orderId) return undefined;
    let alive = true;
    const load = () => api('/orders').then(({ orders: o }) => alive && setOrders(o)).catch((e) => alive && setErr(e.message));
    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [user, orderId]);

  let body;
  if (!checked) body = <div className="center-page"><Spinner /></div>;
  else if (!user) body = <Empty icon="🔐" title="Log in to see your orders"><button className="btn primary" onClick={() => useStore.getState().requireLogin(null)}>Log in</button></Empty>;
  else if (orderId) body = <OrderDetail orderId={orderId} />;
  else if (err) body = <Empty icon="⚠️" title="Couldn’t load orders"><p className="muted">{err}</p></Empty>;
  else if (!orders) body = <div className="center-page"><Spinner /></div>;
  else if (!orders.length) body = <Empty title="No orders yet"><p className="muted">Your groceries are just 10 minutes away.</p><Link className="btn primary" to="/">Start shopping</Link></Empty>;
  else body = (
    <>
      <h1>My Orders</h1>
      <ul className="orders">
        {orders.map((o) => (
          <li key={o.orderId}>
            <Link to={`/orders/${o.orderId}`} className="order-row">
              <span className="emojis">{o.items.slice(0, 4).map((i) => i.emoji).join(' ')}</span>
              <span className="grow"><b>#{o.orderId}</b><span className="muted small">{new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {o.items.reduce((s, i) => s + i.qty, 0)} items</span></span>
              <span className="col-end"><b>{rupee(o.bill.total)}</b><span className={`status s-${o.status}`}>{STATUS_LABEL[o.status]}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
  return (
    <div className="app mode-page">
      <TopBar />
      <main className="page">{body}</main>
    </div>
  );
}
