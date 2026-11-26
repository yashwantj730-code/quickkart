import { motion } from 'framer-motion';
import Modal from './Modal.jsx';
import { Logo } from './bits.jsx';
import { useStore } from '../state/store.js';
import { isTouch } from '../lib/webgl.js';

export function LoadingScreen({ progress, label }) {
  return (
    <motion.div className="loading" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><Logo /></motion.div>
      <p className="loading-label">{label}</p>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><motion.span animate={{ width: `${progress}%` }} /></div>
      <p className="muted small">{Math.round(progress)}% · Stocking the shelves…</p>
    </motion.div>
  );
}

export function HelpOverlay() {
  const touch = isTouch();
  const close = () => { localStorage.setItem('qk_help_seen', '1'); useStore.getState().closePanel(); };
  return (
    <Modal onClose={close} label="How to shop" className="help">
      <h2>Welcome to QuickKart 3D 👋</h2>
      <p className="muted">Walk the aisles, pick groceries off the shelves and check out at the counter.</p>
      <ul className="keys">
        {touch ? (
          <>
            <li><kbd>🕹️</kbd> Left joystick to walk and turn</li>
            <li><kbd>👆</kbd> Drag anywhere to look around</li>
            <li><kbd>Tap</kbd> a product (or the Pick button) to open it</li>
          </>
        ) : (
          <>
            <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / <kbd>↑</kbd><kbd>↓</kbd> walk · <kbd>←</kbd><kbd>→</kbd> turn</li>
            <li><kbd>Mouse drag</kbd> look around · <kbd>Shift</kbd> run</li>
            <li><kbd>Click</kbd> a product or press <kbd>E</kbd> when facing it</li>
          </>
        )}
        <li><kbd>🔍</kbd> Search to get yellow arrows to any product (⚡ to teleport)</li>
        <li><kbd>🧾</kbd> Walk to a yellow CHECKOUT counter (or tap the cart) to pay</li>
      </ul>
      <button className="btn primary block" onClick={close}>Start shopping</button>
    </Modal>
  );
}
