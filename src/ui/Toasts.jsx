import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../state/store.js';

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className={`toast ${t.kind}`} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
            {t.icon && <span className="toast-icon">{t.icon}</span>}{t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
