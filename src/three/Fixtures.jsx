import { useMemo } from 'react';
import * as THREE from 'three';
import { BOUNDS, FIXTURES, COUNTERS, CAT_STYLE, DOOR } from './layout.js';
import { floorTexture, signTexture, textTexture } from './textures.js';

const W = BOUNDS.maxX - BOUNDS.minX;
const D = BOUNDS.maxZ - BOUNDS.minZ;
const H = BOUNDS.height;
const noRay = () => null;

function Room() {
  const floor = useMemo(() => floorTexture(), []);
  const banner = useMemo(() => textTexture('banner', 'QuickKart · groceries in 10 minutes ⚡', { bg: '#0c831f', fg: '#ffd60a', w: 1024, h: 128, font: 'bold 58px system-ui, sans-serif' }), []);
  const mat = useMemo(() => textTexture('mat', 'WELCOME TO QUICKKART', { bg: '#1b5e20', fg: '#ffd60a', w: 512, h: 128, font: 'bold 44px system-ui, sans-serif' }), []);
  const panels = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.06, 0.6), new THREE.MeshBasicMaterial({ color: '#fffdf2' }), 7 * 5);
    const o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) {
      o.position.set(BOUNDS.minX + 3 + i * 5.6, H - 0.04, BOUNDS.minZ + 3 + j * 6.5); o.updateMatrix(); m.setMatrixAt(k++, o.matrix);
    }
    m.raycast = noRay;
    return m;
  }, []);
  const doorLeft = DOOR.x - DOOR.width / 2, doorRight = DOOR.x + DOOR.width / 2;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={noRay}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={floor} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, H, 0]} rotation-x={Math.PI / 2} raycast={noRay}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#f7f7f2" />
      </mesh>
      <primitive object={panels} />
      {/* back + side walls */}
      <mesh position={[0, H / 2, BOUNDS.minZ]} raycast={noRay}><planeGeometry args={[W, H]} /><meshStandardMaterial color="#e8f5e9" /></mesh>
      <mesh position={[BOUNDS.minX, H / 2, 0]} rotation-y={Math.PI / 2} raycast={noRay}><planeGeometry args={[D, H]} /><meshStandardMaterial color="#fffbea" /></mesh>
      <mesh position={[BOUNDS.maxX, H / 2, 0]} rotation-y={-Math.PI / 2} raycast={noRay}><planeGeometry args={[D, H]} /><meshStandardMaterial color="#fffbea" /></mesh>
      {/* green wainscot band */}
      <mesh position={[0, 0.3, BOUNDS.minZ + 0.01]} raycast={noRay}><planeGeometry args={[W, 0.6]} /><meshStandardMaterial color="#0c831f" /></mesh>
      <mesh position={[BOUNDS.minX + 0.01, 0.3, 0]} rotation-y={Math.PI / 2} raycast={noRay}><planeGeometry args={[D, 0.6]} /><meshStandardMaterial color="#0c831f" /></mesh>
      <mesh position={[BOUNDS.maxX - 0.01, 0.3, 0]} rotation-y={-Math.PI / 2} raycast={noRay}><planeGeometry args={[D, 0.6]} /><meshStandardMaterial color="#0c831f" /></mesh>
      {/* banner on left wall */}
      <mesh position={[BOUNDS.minX + 0.02, 3.4, 8]} rotation-y={Math.PI / 2} raycast={noRay}><planeGeometry args={[9, 1.1]} /><meshBasicMaterial map={banner} toneMapped={false} /></mesh>
      {/* front wall with entrance gap */}
      <mesh position={[(BOUNDS.minX + doorLeft) / 2, H / 2, BOUNDS.maxZ]} rotation-y={Math.PI} raycast={noRay}><planeGeometry args={[doorLeft - BOUNDS.minX, H]} /><meshStandardMaterial color="#e8f5e9" /></mesh>
      <mesh position={[(doorRight + BOUNDS.maxX) / 2, H / 2, BOUNDS.maxZ]} rotation-y={Math.PI} raycast={noRay}><planeGeometry args={[BOUNDS.maxX - doorRight, H]} /><meshStandardMaterial color="#e8f5e9" /></mesh>
      <mesh position={[DOOR.x, (H + 2.6) / 2, BOUNDS.maxZ]} rotation-y={Math.PI} raycast={noRay}><planeGeometry args={[DOOR.width, H - 2.6]} /><meshStandardMaterial color="#0c831f" /></mesh>
      {/* glass doors */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[DOOR.x + s * DOOR.width / 4, 1.3, BOUNDS.maxZ - 0.02]} raycast={noRay}>
          <boxGeometry args={[DOOR.width / 2 - 0.08, 2.6, 0.05]} />
          <meshStandardMaterial color="#b3e5fc" transparent opacity={0.28} />
        </mesh>
      ))}
      <mesh position={[DOOR.x, 0.005, BOUNDS.maxZ - 1.4]} rotation-x={-Math.PI / 2} raycast={noRay}><planeGeometry args={[4, 1]} /><meshStandardMaterial map={mat} /></mesh>
    </group>
  );
}

function Sign({ fx }) {
  const st = CAT_STYLE[fx.category];
  const tex = useMemo(() => signTexture(st.label, st.color, st.icon, fx.aisle), [st, fx.aisle]);
  const [x, y, z] = fx.sign.pos;
  return (
    <group position={[x, y, z]} rotation-y={fx.sign.rotY}>
      <mesh raycast={noRay}><boxGeometry args={[3.6, 0.9, 0.06]} /><meshStandardMaterial color={st.color} /></mesh>
      <mesh position={[0, 0, 0.032]} raycast={noRay}><planeGeometry args={[3.5, 0.84]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <mesh position={[0, 0, -0.032]} rotation-y={Math.PI} raycast={noRay}><planeGeometry args={[3.5, 0.84]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      {[-1.4, 1.4].map((wx) => (
        <mesh key={wx} position={[wx, 0.45 + (H - y - 0.45) / 2, 0]} raycast={noRay}><cylinderGeometry args={[0.012, 0.012, H - y - 0.45, 4]} /><meshBasicMaterial color="#666" /></mesh>
      ))}
    </group>
  );
}

function Gondola({ fx }) {
  const st = CAT_STYLE[fx.category];
  const levels = fx.faces[0].levels;
  return (
    <group position={[fx.x, 0, fx.z]}>
      <mesh position={[0, 0.06, 0]} raycast={noRay}><boxGeometry args={[fx.w, 0.12, fx.d]} /><meshStandardMaterial color="#455a64" /></mesh>
      <mesh position={[0, fx.h / 2, 0]} raycast={noRay}><boxGeometry args={[0.1, fx.h, fx.d]} /><meshStandardMaterial color="#eceff1" /></mesh>
      {levels.map((y) => (
        <mesh key={y} position={[0, y - 0.02, 0]} raycast={noRay}><boxGeometry args={[fx.w, 0.04, fx.d]} /><meshStandardMaterial color="#cfd8dc" metalness={0.2} roughness={0.5} /></mesh>
      ))}
      {levels.map((y) => [-1, 1].map((s) => (
        <mesh key={`${y}${s}`} position={[s * (fx.w / 2), y - 0.07, 0]} raycast={noRay}><boxGeometry args={[0.02, 0.09, fx.d]} /><meshStandardMaterial color={st.color} /></mesh>
      )))}
      <mesh position={[0, fx.h, 0]} raycast={noRay}><boxGeometry args={[fx.w + 0.04, 0.1, fx.d + 0.04]} /><meshStandardMaterial color={st.color} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, fx.h / 2, s * (fx.d / 2)]} raycast={noRay}><boxGeometry args={[fx.w + 0.06, fx.h, 0.08]} /><meshStandardMaterial color={st.color} /></mesh>
      ))}
    </group>
  );
}

function Produce({ fx }) {
  return (
    <group position={[fx.x, 0, fx.z]}>
      <mesh position={[0.65, 0.39, 0]} raycast={noRay}><boxGeometry args={[1.3, 0.78, fx.d]} /><meshStandardMaterial color="#8d6e63" /></mesh>
      <mesh position={[-0.65, 0.52, 0]} raycast={noRay}><boxGeometry args={[1.3, 1.04, fx.d]} /><meshStandardMaterial color="#795548" /></mesh>
      <mesh position={[1.31, 0.4, 0]} raycast={noRay}><boxGeometry args={[0.03, 0.5, fx.d]} /><meshStandardMaterial color="#2e9d3a" /></mesh>
    </group>
  );
}

function Fridge({ fx }) {
  const st = CAT_STYLE[fx.category];
  const len = Math.max(fx.w, fx.d);
  const n = fx.faces[0].n;
  const rotY = Math.atan2(n[0], n[1]);
  const depth = Math.min(fx.w, fx.d);
  return (
    <group position={[fx.x, 0, fx.z]} rotation-y={rotY}>
      {/* in local space the fridge front faces +z */}
      <mesh position={[0, fx.h / 2, -depth / 2 + 0.05]} raycast={noRay}><boxGeometry args={[len, fx.h, 0.1]} /><meshStandardMaterial color="#f5f5f5" /></mesh>
      <mesh position={[0, 0.15, 0]} raycast={noRay}><boxGeometry args={[len, 0.3, depth]} /><meshStandardMaterial color="#37474f" /></mesh>
      <mesh position={[0, fx.h + 0.12, 0]} raycast={noRay}><boxGeometry args={[len, 0.24, depth]} /><meshStandardMaterial color={st.color} /></mesh>
      {fx.faces[0].levels.map((y) => (
        <mesh key={y} position={[0, y - 0.02, 0]} raycast={noRay}><boxGeometry args={[len - 0.1, 0.03, depth - 0.1]} /><meshStandardMaterial color="#e0f7fa" transparent opacity={0.7} /></mesh>
      ))}
      <mesh position={[0, fx.h - 0.05, -depth / 2 + 0.12]} raycast={noRay}><boxGeometry args={[len - 0.2, 0.04, 0.04]} /><meshBasicMaterial color="#e3f2fd" /></mesh>
      {Array.from({ length: Math.round(len / 2) + 1 }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (i * len) / Math.round(len / 2), fx.h / 2 + 0.15, depth / 2 - 0.02]} raycast={noRay}><boxGeometry args={[0.06, fx.h - 0.3, 0.06]} /><meshStandardMaterial color="#b0bec5" metalness={0.5} /></mesh>
      ))}
      <mesh position={[0, fx.h / 2 + 0.15, depth / 2 - 0.02]} raycast={noRay} renderOrder={2}>
        <planeGeometry args={[len, fx.h - 0.3]} />
        <meshStandardMaterial color="#e1f5fe" transparent opacity={0.16} depthWrite={false} roughness={0.05} />
      </mesh>
    </group>
  );
}

function Counter({ c }) {
  const sign = useMemo(() => textTexture('checkout', 'CHECKOUT  ✓', { bg: '#ffd60a', fg: '#0c831f', font: 'bold 64px system-ui, sans-serif' }), []);
  return (
    <group position={[c.x, 0, c.z]}>
      <mesh position={[0, c.h / 2, 0]} castShadow raycast={noRay}><boxGeometry args={[c.w, c.h, c.d]} /><meshStandardMaterial color="#0c831f" /></mesh>
      <mesh position={[0, c.h + 0.01, 0]} raycast={noRay}><boxGeometry args={[c.w - 0.1, 0.03, c.d - 0.25]} /><meshStandardMaterial color="#263238" roughness={0.9} /></mesh>
      <mesh position={[c.w / 2 - 0.45, c.h + 0.15, 0.1]} raycast={noRay}><boxGeometry args={[0.5, 0.25, 0.4]} /><meshStandardMaterial color="#eceff1" /></mesh>
      <mesh position={[c.w / 2 - 0.45, c.h + 0.45, 0.2]} rotation-x={-0.3} raycast={noRay}><boxGeometry args={[0.42, 0.3, 0.04]} /><meshStandardMaterial color="#212121" emissive="#1de9b6" emissiveIntensity={0.35} /></mesh>
      {/* cashier */}
      <group position={[c.w / 2 - 0.5, 0, 1.05]} rotation-y={Math.PI}>
        <mesh position={[0, 0.5, 0]} raycast={noRay}><cylinderGeometry args={[0.16, 0.18, 1.0, 10]} /><meshStandardMaterial color="#263238" /></mesh>
        <mesh position={[0, 1.25, 0]} raycast={noRay}><cylinderGeometry args={[0.22, 0.2, 0.55, 10]} /><meshStandardMaterial color="#ffd60a" /></mesh>
        <mesh position={[0, 1.7, 0]} raycast={noRay}><sphereGeometry args={[0.16, 14, 12]} /><meshStandardMaterial color="#c68642" /></mesh>
        <mesh position={[0, 1.83, -0.02]} raycast={noRay}><sphereGeometry args={[0.165, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#0c831f" /></mesh>
      </group>
      <group position={[0, 3.0, 0]}>
        <mesh raycast={noRay}><boxGeometry args={[2.4, 0.6, 0.06]} /><meshStandardMaterial color="#ffd60a" /></mesh>
        <mesh position={[0, 0, -0.035]} rotation-y={Math.PI} raycast={noRay}><planeGeometry args={[2.3, 0.55]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.035]} raycast={noRay}><planeGeometry args={[2.3, 0.55]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      </group>
    </group>
  );
}

export function Fixtures() {
  return (
    <group>
      <Room />
      {FIXTURES.map((fx) => (
        <group key={fx.id}>
          {fx.type === 'gondola' && <Gondola fx={fx} />}
          {fx.type === 'produce' && <Produce fx={fx} />}
          {fx.type === 'fridge' && <Fridge fx={fx} />}
          <Sign fx={fx} />
        </group>
      ))}
      {COUNTERS.map((c) => <Counter key={c.id} c={c} />)}
    </group>
  );
}
