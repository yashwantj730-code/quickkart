import { motion } from 'framer-motion';
import { useEffect } from 'react';

// Accessible modal / bottom-sheet. variant: 'center' | 'side' | 'sheet'
export default function Modal({ onClose, children, label, variant = 'center', className = '' }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <motion.div className={`overlay ${variant}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <motion.div
        role="dialog" aria-modal="true" aria-label={label}
        className={`modal ${variant} ${className}`}
        initial={variant === 'side' ? { x: 60, opacity: 0 } : { y: 40, opacity: 0, scale: 0.97 }}
        animate={variant === 'side' ? { x: 0, opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
        exit={variant === 'side' ? { x: 60, opacity: 0 } : { y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {children}
      </motion.div>
    </motion.div>
  );
}
