import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Fixtures } from './Fixtures.jsx';
import { Products } from './Products.jsx';
import { Player } from './Player.jsx';
import { Guide } from './Guide.jsx';
import { computePlacements } from './layout.js';
import { input, world } from './playerState.js';
import { useStore } from '../state/store.js';

function FirstFrame({ onReady }) {
  const n = useRef(0);
  useFrame(() => { if (n.current < 3 && ++n.current === 3) onReady(); });
  return null;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#cfe8d0', 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 14, 8]} intensity={1.35} castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0005}
        shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={18} shadow-camera-bottom={-18}
        shadow-camera-near={1} shadow-camera-far={40}
      />
    </>
  );
}

export default function StoreScene({ onProgress, onReady, onError }) {
  const products = useStore((s) => s.products);
  const placements = useMemo(() => computePlacements(products), [products]);
  const [hoverId, setHoverId] = useState(null);
  const [dpr, setDpr] = useState(Math.min(1.75, window.devicePixelRatio || 1));
  const drag = useRef(null);
  const alive = useRef(true);
  world.placements = placements;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => { onProgress?.(70); }, [onProgress]);

  // drag-to-look (mouse + touch). The joystick stops propagation so it never reaches here.
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    input.lookDX += e.clientX - d.x;
    input.lookDY += e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
  };
  const end = (e) => { if (drag.current?.id === e.pointerId) drag.current = null; };

  return (
    <div
      className="scene-wrap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: 60, near: 0.1, far: 80, position: [4, 2.6, 16] }}
        gl={{ antialias: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          scene.background = new THREE.Color('#f3f8f2');
          scene.fog = new THREE.Fog('#f3f8f2', 26, 60);
          gl.domElement.addEventListener('webglcontextlost', (ev) => {
            ev.preventDefault();
            // r3f force-loses the context on unmount; only treat it as a failure while still mounted.
            setTimeout(() => { if (alive.current) onError?.(new Error('WebGL context lost')); }, 1500);
          });
        }}
        onPointerMissed={() => setHoverId(null)}
      >
        <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))} onIncline={() => setDpr((d) => Math.min(1.75, d + 0.25))} flipflops={4} />
        <AdaptiveDpr pixelated />
        <Lights />
        <Fixtures />
        <Products placements={placements} hoverId={hoverId} setHoverId={setHoverId} />
        <Guide placements={placements} />
        <Player placements={placements} />
        <FirstFrame onReady={() => onReady?.()} />
      </Canvas>
    </div>
  );
}
