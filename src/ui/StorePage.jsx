import { Component, lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from './TopBar.jsx';
import ListView from './ListView.jsx';
import MiniMap from './MiniMap.jsx';
import Joystick from './Joystick.jsx';
import ProductCard from './ProductCard.jsx';
import Checkout from './Checkout.jsx';
import { LoadingScreen, HelpOverlay } from './Overlays.jsx';
import { Empty } from './bits.jsx';
import { useStore } from '../state/store.js';
import { hasWebGL, isTouch } from '../lib/webgl.js';
import { input } from '../three/playerState.js';

const StoreScene = lazy(() => import('../three/StoreScene.jsx'));

class SceneBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { this.props.onError?.(err); }
  render() { return this.state.err ? null : this.props.children; }
}

function Prompt() {
  const aimId = useStore((s) => s.aimId);
  const name = useStore((s) => (s.aimId ? s.byId[s.aimId]?.name : null));
  const zone = useStore((s) => s.inCheckoutZone);
  const count = useStore((s) => s.cart.length);
  const panel = useStore((s) => s.panel);
  const target = useStore((s) => s.searchTarget);
  const targetName = useStore((s) => (s.searchTarget ? s.byId[s.searchTarget]?.name : null));
  const st = useStore.getState();
  return (
    <div className="prompts">
      <AnimatePresence>
        {!panel && target && (
          <motion.div key="guide" className="prompt guide" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            🧭 Guiding to <b>{targetName}</b>
            <button className="btn tiny" onClick={() => st.requestTeleport()}>⚡ Teleport</button>
            <button className="btn tiny ghost" onClick={() => st.setSearchTarget(null)} aria-label="Stop guiding">✕</button>
          </motion.div>
        )}
        {!panel && zone && (
          <motion.button key="zone" className="prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => st.openPanel('checkout')}>
            <kbd>E</kbd> {count ? 'Checkout here' : 'Your cart is empty - grab something first!'}
          </motion.button>
        )}
        {!panel && !zone && aimId && (
          <motion.button key={aimId} className="prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={() => st.openPanel('product', aimId)}>
            <kbd>E</kbd> Pick <b>{name}</b>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StorePage() {
  const status = useStore((s) => s.catalogStatus);
  const viewMode = useStore((s) => s.viewMode);
  const panel = useStore((s) => s.panel);
  const panelArg = useStore((s) => s.panelArg);
  const [webgl] = useState(() => hasWebGL());
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(10);
  const [ready, setReady] = useState(false);
  const touch = isTouch();
  const use3d = viewMode === '3d' && webgl && !failed;

  useEffect(() => { if (status === 'ready') setProgress((p) => Math.max(p, 40)); }, [status]);
  useEffect(() => {
    if (ready && use3d && !localStorage.getItem('qk_help_seen') && !useStore.getState().panel) useStore.getState().openPanel('help');
  }, [ready, use3d]);
  useEffect(() => () => { input.keys.clear(); input.joy.x = 0; input.joy.y = 0; }, []);

  const onError = useCallback((e) => {
    console.warn('3D view failed, switching to list view:', e?.message);
    setFailed(true);
    useStore.getState().toast('3D view unavailable - showing list view', 'warn');
  }, []);
  const onProgress = useCallback((p) => setProgress((x) => Math.max(x, p)), []);
  const onReady = useCallback(() => { setProgress(100); setTimeout(() => setReady(true), 250); }, []);

  const notice = viewMode === '3d' && (!webgl || failed) ? 'Your device can’t show the 3D store, so here’s the quick list view. Everything else works the same.' : null;

  return (
    <div className={`app ${use3d ? 'mode-3d' : 'mode-list'}`}>
      <TopBar />
      {status === 'error' && (
        <Empty icon="📡" title="Couldn’t load the store">
          <p className="muted">Check your connection and try again.</p>
          <button className="btn primary" onClick={() => useStore.getState().loadCatalog()}>Retry</button>
        </Empty>
      )}
      {status === 'ready' && use3d && (
        <SceneBoundary onError={onError}>
          <Suspense fallback={null}>
            <StoreScene onProgress={onProgress} onReady={onReady} onError={onError} />
          </Suspense>
          {ready && (
            <>
              <MiniMap />
              <Prompt />
              {touch && <Joystick />}
              {!touch && <div className="hint-keys">WASD move · drag look · Shift run · E pick · <button className="link" onClick={() => useStore.getState().openPanel('help')}>help</button></div>}
            </>
          )}
        </SceneBoundary>
      )}
      {status === 'ready' && !use3d && <ListView notice={notice} />}
      <AnimatePresence>{use3d && !ready && status !== 'error' && <LoadingScreen progress={status === 'ready' ? progress : 15} label={status === 'ready' ? 'Building your 3D store' : 'Loading products'} />}</AnimatePresence>
      <AnimatePresence>
        {panel === 'product' && <ProductCard key={`p-${panelArg}`} id={panelArg} />}
        {panel === 'checkout' && <Checkout key="checkout" />}
        {panel === 'help' && <HelpOverlay key="help" />}
      </AnimatePresence>
    </div>
  );
}
