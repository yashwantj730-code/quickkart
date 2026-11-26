import { useRef, useState } from 'react';
import { input } from '../three/playerState.js';

const R = 52;
export default function Joystick() {
  const base = useRef();
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pid = useRef(null);
  const update = (e) => {
    const r = base.current.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob({ x: dx, y: dy });
    input.joy.x = dx / R; input.joy.y = -dy / R;
  };
  const stop = (e) => { e.stopPropagation(); if (e.pointerId !== pid.current) return; pid.current = null; setKnob({ x: 0, y: 0 }); input.joy.x = 0; input.joy.y = 0; };
  return (
    <div
      className="joystick" ref={base} aria-label="Movement joystick" role="application"
      onPointerDown={(e) => { e.stopPropagation(); pid.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e); }}
      onPointerMove={(e) => { e.stopPropagation(); if (e.pointerId === pid.current) update(e); }}
      onPointerUp={stop} onPointerCancel={stop}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
