import { useEffect, useRef, useState } from 'react';
import { BOUNDS, FIXTURES, COUNTERS, CAT_STYLE } from '../three/layout.js';
import { player, nav } from '../three/playerState.js';

const W = 170, H = 136;
const sx = (x) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * W;
const sz = (z) => ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * H;

export default function MiniMap() {
  const me = useRef();
  const path = useRef();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    let raf;
    const loop = () => {
      if (me.current) me.current.setAttribute('transform', `translate(${sx(player.x)} ${sz(player.z)}) rotate(${(-player.yaw * 180) / Math.PI + 180})`);
      if (path.current) path.current.setAttribute('points', nav.path.map(([x, z]) => `${sx(x)},${sz(z)}`).join(' '));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`minimap ${open ? '' : 'closed'}`}>
      <button className="mm-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Hide map' : 'Show map'}>{open ? '🗺️ ▾' : '🗺️'}</button>
      {open && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Store map">
          <rect width={W} height={H} rx="10" fill="#f4fbf4" stroke="#0c831f" strokeWidth="2" />
          {FIXTURES.map((f) => (
            <g key={f.id}>
              <rect x={sx(f.x - f.w / 2)} y={sz(f.z - f.d / 2)} width={(f.w / 40) * W} height={(f.d / 32) * H} rx="1.5" fill={CAT_STYLE[f.category].color} opacity="0.85" />
              <text x={sx(f.x)} y={sz(f.z) + 3} fontSize="7" fill="#fff" textAnchor="middle" fontWeight="700">{f.aisle}</text>
            </g>
          ))}
          {COUNTERS.map((c) => <rect key={c.id} x={sx(c.x - c.w / 2)} y={sz(c.z - c.d / 2)} width={(c.w / 40) * W} height={4} fill="#ffd60a" stroke="#0c831f" strokeWidth="0.6" />)}
          <text x={sx(-9.25)} y={sz(14.6)} fontSize="7" textAnchor="middle" fill="#0c831f" fontWeight="700">CHECKOUT</text>
          <rect x={sx(1)} y={H - 3} width={(6 / 40) * W} height="3" fill="#0c831f" />
          <polyline ref={path} fill="none" stroke="#f9a825" strokeWidth="2" strokeDasharray="3 2" />
          <g ref={me}><path d="M0 -6 L4.5 5 L0 2.5 L-4.5 5 Z" fill="#d32f2f" stroke="#fff" strokeWidth="1" /></g>
        </svg>
      )}
    </div>
  );
}
