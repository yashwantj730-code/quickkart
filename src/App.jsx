import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './state/store.js';
import StorePage from './ui/StorePage.jsx';
import OrdersPage from './ui/OrdersPage.jsx';
import Toasts from './ui/Toasts.jsx';
import AuthModal from './ui/AuthModal.jsx';
import { Spinner } from './ui/bits.jsx';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

export default function App() {
  const loadCatalog = useStore((s) => s.loadCatalog);
  const fetchMe = useStore((s) => s.fetchMe);
  const panel = useStore((s) => s.panel);
  useEffect(() => { loadCatalog().then(fetchMe); }, [loadCatalog, fetchMe]);
  return (
    <>
      <Routes>
        <Route path="/" element={<StorePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrdersPage />} />
        <Route path="/admin/*" element={<Suspense fallback={<div className="center-page"><Spinner /></div>}><AdminApp /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {panel === 'auth' && <AuthModal />}
      <Toasts />
    </>
  );
}
