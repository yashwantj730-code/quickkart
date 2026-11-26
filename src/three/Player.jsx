import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BOUNDS, FIXTURES, COUNTERS, CHECKOUT_ZONES, CART_OFFSET, SPAWN, shopperBlocked } from './layout.js';
import { player, input, flights } from './playerState.js';
import { useStore } from '../state/store.js';

const WALK = 3.4, RUN = 6.2, TURN = 2.4;
const solids = [
  ...FIXTURES.map((f) => ({ x: f.x, z: f.z, w: f.w, d: f.d, h: f.h + 0.3 })),
  ...COUNTERS.map((c) => ({ x: c.x, z: c.z, w: c.w, d: c.d, h: 3.4 })),
];
function camBlocked(x, y, z) {
  if (x < BOUNDS.minX + 0.3 || x > BOUNDS.maxX - 0.3 || z < BOUNDS.minZ + 0.3 || z > BOUNDS.maxZ - 0.3) return true;
  return solids.some((b) => y < b.h && Math.abs(x - b.x) < b.w / 2 + 0.25 && Math.abs(z - b.z) < b.d / 2 + 0.25);
}

function useKeyboard() {
  useEffect(() => {
    const typing = (e) => /input|textarea|select/i.test(e.target?.tagName || '') || e.target?.isContentEditable;
    const down = (e) => {
      if (typing(e)) return;
      if (useStore.getState().panel) { input.keys.clear(); return; }
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q'].includes(k)) {
        input.keys.add(k);
        if (k.startsWith('arrow')) e.preventDefault();
      }
      if (k === 'e' && !e.repeat) input.interact++;
    };
    const up = (e) => input.keys.delete(e.key.toLowerCase());
    const blur = () => input.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
}

function Shopper({ walkRef }) {
  const legL = useRef(), legR = useRef();
  useFrame(() => {
    const t = walkRef.current;
    const a = Math.sin(t) * 0.5 * Math.min(1, player.speed / 3);
    if (legL.current) { legL.current.rotation.x = a; legR.current.rotation.x = -a; }
  });
  return (
    <group>
      <group ref={legL} position={[-0.11, 0.85, 0]}><mesh position={[0, -0.42, 0]} castShadow><boxGeometry args={[0.15, 0.84, 0.17]} /><meshStandardMaterial color="#283593" /></mesh></group>
      <group ref={legR} position={[0.11, 0.85, 0]}><mesh position={[0, -0.42, 0]} castShadow><boxGeometry args={[0.15, 0.84, 0.17]} /><meshStandardMaterial color="#283593" /></mesh></group>
      <mesh position={[0, 1.18, 0]} castShadow><boxGeometry args={[0.46, 0.66, 0.26]} /><meshStandardMaterial color="#0c831f" /></mesh>
      <mesh position={[0, 1.3, 0.135]}><planeGeometry args={[0.2, 0.12]} /><meshBasicMaterial color="#ffd60a" /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.25, 1.15, 0.28]} rotation-x={-1.2} castShadow><boxGeometry args={[0.11, 0.58, 0.11]} /><meshStandardMaterial color="#c68642" /></mesh>
      ))}
      <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[0.17, 16, 12]} /><meshStandardMaterial color="#c68642" /></mesh>
      <mesh position={[0, 1.76, -0.01]}><sphereGeometry args={[0.175, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
      <mesh position={[0, 1.79, 0.08]} rotation-x={-0.25}><cylinderGeometry args={[0.19, 0.19, 0.04, 16, 1, false, -Math.PI / 2, Math.PI]} /><meshStandardMaterial color="#ffd60a" /></mesh>
    </group>
  );
}

const ITEM_GEO = new THREE.BoxGeometry(0.15, 0.13, 0.15);
const CART_SLOTS = (() => {
  const s = [];
  for (let layer = 0; layer < 4; layer++) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s.push([-0.17 + c * 0.17, 0.62 + layer * 0.135, -0.27 + r * 0.18]);
  return s;
})();

function CartContents() {
  const cart = useStore((s) => s.cart);
  const byId = useStore((s) => s.byId);
  const flying = useStore((s) => s.flying);
  const ref = useRef();
  const units = useMemo(() => {
    const inAir = {};
    flying.forEach((id) => { inAir[id] = (inAir[id] || 0) + 1; });
    const u = [];
    for (const it of cart) {
      const n = Math.max(0, it.qty - (inAir[it.productId] || 0));
      for (let k = 0; k < n; k++) u.push(byId[it.productId]?.color || '#999');
    }
    return u.slice(0, CART_SLOTS.length);
  }, [cart, byId, flying]);
  useEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new THREE.Object3D(); const col = new THREE.Color();
    units.forEach((c, i) => {
      o.position.set(...CART_SLOTS[i]); o.rotation.set(0, (i % 5) * 0.3 - 0.6, 0); o.updateMatrix();
      m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(c));
    });
    m.count = units.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [units]);
  return (
    <instancedMesh ref={ref} args={[ITEM_GEO, undefined, CART_SLOTS.length]} castShadow raycast={() => null}>
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

function ShoppingCart() {
  const wire = { color: '#90a4ae', metalness: 0.7, roughness: 0.3 };
  return (
    <group position={[0, 0, CART_OFFSET]}>
      {/* basket */}
      <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.62, 0.03, 0.9]} /><meshStandardMaterial {...wire} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={`s${s}`} position={[s * 0.31, 0.8, 0]}><boxGeometry args={[0.02, 0.5, 0.9]} /><meshStandardMaterial {...wire} transparent opacity={0.55} /></mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`f${s}`} position={[0, 0.8, s * 0.45]}><boxGeometry args={[0.64, 0.5, 0.02]} /><meshStandardMaterial {...wire} transparent opacity={0.55} /></mesh>
      ))}
      <mesh position={[0, 1.06, 0]}><boxGeometry args={[0.66, 0.03, 0.94]} /><meshStandardMaterial color="#0c831f" /></mesh>
      {/* handle */}
      <mesh position={[0, 1.1, -0.55]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.025, 0.025, 0.66, 8]} /><meshStandardMaterial color="#ffd60a" /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={`h${s}`} position={[s * 0.31, 1.08, -0.5]} rotation-x={0.6}><boxGeometry args={[0.02, 0.02, 0.14]} /><meshStandardMaterial {...wire} /></mesh>
      ))}
      {/* frame + wheels */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <group key={`${sx}${sz}`} position={[sx * 0.26, 0, sz * 0.36]}>
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.02, 0.5, 0.02]} /><meshStandardMaterial {...wire} /></mesh>
          <mesh position={[0, 0.05, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.04, 10]} /><meshStandardMaterial color="#212121" /></mesh>
        </group>
      )))}
      <mesh position={[0, 0.2, 0]}><boxGeometry args={[0.5, 0.02, 0.75]} /><meshStandardMaterial {...wire} /></mesh>
      <CartContents />
    </group>
  );
}

const flyGeo = new THREE.BoxGeometry(0.2, 0.22, 0.14);
function Flights() {
  const pool = useRef([]);
  useFrame(() => {
    const now = performance.now();
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    const cart = [player.x + fx * CART_OFFSET, 0.95, player.z + fz * CART_OFFSET];
    for (let i = flights.length - 1; i >= 0; i--) if (now - flights[i].t0 > 700) flights.splice(i, 1);
    pool.current.forEach((m, i) => {
      const f = flights[i];
      if (!m) return;
      if (!f) { m.visible = false; return; }
      const t = Math.min(1, (now - f.t0) / 700);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      m.visible = true;
      m.position.set(f.from[0] + (cart[0] - f.from[0]) * e, f.from[1] + (cart[1] - f.from[1]) * e + Math.sin(Math.PI * t) * 1.1, f.from[2] + (cart[2] - f.from[2]) * e);
      m.rotation.set(t * 6, t * 4, 0);
      m.scale.setScalar(1 - t * 0.35);
      m.material.color.set(f.color);
    });
  });
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(m) => { pool.current[i] = m; }} geometry={flyGeo} visible={false} raycast={() => null}>
          <meshStandardMaterial emissive="#ffd60a" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

export function Player({ placements }) {
  const group = useRef();
  const walk = useRef(0);
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());
  const lastInteract = useRef(input.interact);
  const frame = useRef(0);
  const zoneState = useRef({ inside: false });
  const teleportSeen = useRef(useStore.getState().teleportReq);
  const prevTarget = useRef(null);
  useKeyboard();

  const clusters = useMemo(() => {
    const arr = [];
    placements.forEach((v, id) => v.clusters.forEach((c) => arr.push({ id, ...c })));
    return arr;
  }, [placements]);

  const snapCamera = () => {
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    camPos.current.set(player.x - fx * 3.7 - fz * 0.75, 2.75, player.z - fz * 3.7 + fx * 0.75);
    camera.position.copy(camPos.current);
  };
  useEffect(() => { snapCamera(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useStore.getState();
    const k = input.keys;
    const blocked = !!st.panel;
    frame.current++;

    // ---- teleport request (from search) ----
    if (st.teleportReq !== teleportSeen.current) {
      teleportSeen.current = st.teleportReq;
      const target = st.searchTarget && nearestCluster(st.searchTarget);
      if (target) {
        const yaw = target.yaw + Math.PI;
        if (!shopperBlocked(target.stand[0], target.stand[1], yaw)) {
          player.x = target.stand[0]; player.z = target.stand[1]; player.yaw = yaw;
          snapCamera();
          st.setSearchTarget(null);
          st.openPanel('product', target.id);
        }
      }
    }

    // ---- movement ----
    let fwd = 0, strafe = 0, turn = 0;
    if (!blocked) {
      if (k.has('w') || k.has('arrowup')) fwd += 1;
      if (k.has('s') || k.has('arrowdown')) fwd -= 1;
      if (k.has('d')) strafe += 1;
      if (k.has('a')) strafe -= 1;
      if (k.has('arrowleft') || k.has('q')) turn += 1;
      if (k.has('arrowright')) turn -= 1;
      fwd += input.joy.y;
      turn -= input.joy.x * 0.9;
    }
    const run = k.has('shift');
    // look (drag)
    let dyaw = turn * TURN * dt - input.lookDX * 0.0055;
    player.pitch = THREE.MathUtils.clamp(player.pitch + input.lookDY * 0.003, -0.25, 0.7);
    input.lookDX = 0; input.lookDY = 0;
    if (dyaw) {
      const ny = player.yaw + dyaw;
      if (!shopperBlocked(player.x, player.z, ny)) player.yaw = ny;
      else if (!shopperBlocked(player.x, player.z, player.yaw + dyaw * 0.3)) player.yaw += dyaw * 0.3;
    }
    const mag = Math.min(1, Math.hypot(fwd, strafe));
    const target = mag * (run ? RUN : WALK);
    player.speed += (target - player.speed) * Math.min(1, dt * 8);
    if (mag > 0.01 && player.speed > 0.01) {
      const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
      const rx = -fz, rz = fx; // right vector (x,z)
      const dirX = (fx * fwd + rx * strafe) / Math.max(mag, 1e-3) * Math.min(1, mag);
      const dirZ = (fz * fwd + rz * strafe) / Math.max(mag, 1e-3) * Math.min(1, mag);
      const step = player.speed * dt;
      const nx = player.x + dirX * step;
      if (!shopperBlocked(nx, player.z, player.yaw)) player.x = nx;
      const nz = player.z + dirZ * step;
      if (!shopperBlocked(player.x, nz, player.yaw)) player.z = nz;
      walk.current += dt * (run ? 13 : 9);
    }
    if (group.current) {
      group.current.position.set(player.x, Math.abs(Math.sin(walk.current)) * 0.03 * Math.min(1, player.speed / 3), player.z);
      group.current.rotation.y = player.yaw;
    }

    // ---- camera ----
    const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
    // over-the-shoulder camera: behind, above and slightly right so the cart stays visible
    const rx = -fz, rz = fx;
    const dist = 3.7 - player.pitch * 1.1;
    const h = 2.75 + player.pitch * 2.4;
    const side = 0.75;
    const head = new THREE.Vector3(player.x + rx * side * 0.5, 1.7, player.z + rz * side * 0.5);
    const want = new THREE.Vector3(player.x - fx * dist + rx * side, h, player.z - fz * dist + rz * side);
    // pull camera in if it would end up inside a wall/fixture
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const p = head.clone().lerp(want, t);
      if (!camBlocked(p.x, p.y, p.z) || i === 0) { want.copy(p); break; }
    }
    const a = 1 - Math.exp(-dt * 9);
    camPos.current.lerp(want, a);
    camera.position.copy(camPos.current);
    lookAt.current.set(player.x + fx * 2.2 + rx * 0.35, 0.95 - player.pitch * 0.7, player.z + fz * 2.2 + rz * 0.35);
    camera.lookAt(lookAt.current);

    // ---- aim / interaction (every 4th frame) ----
    if (frame.current % 4 === 0) {
      const cx = player.x + fx * CART_OFFSET, cz = player.z + fz * CART_OFFSET;
      let best = null, bd = 2.6;
      for (const c of clusters) {
        const dx = c.center[0] - cx, dz = c.center[2] - cz;
        const d = Math.hypot(dx, dz);
        if (d < bd && (dx * fx + dz * fz) / (d || 1) > 0.15) { bd = d; best = c; }
      }
      const aimId = best ? best.id : null;
      if (aimId !== st.aimId) useStore.setState({ aimId, aimFrom: best ? best.center : null });

      const zone = CHECKOUT_ZONES.some((z) => Math.hypot(player.x - z.x, player.z - z.z) < 2.4);
      if (zone !== st.inCheckoutZone) useStore.setState({ inCheckoutZone: zone });
      if (zone && !zoneState.current.inside && st.cart.length && !st.panel) st.openPanel('checkout');
      zoneState.current.inside = zone;

      // search guide arrival
      if (st.searchTarget) {
        if (prevTarget.current !== st.searchTarget) prevTarget.current = st.searchTarget;
        const tc = nearestCluster(st.searchTarget);
        if (tc && Math.hypot(player.x - tc.stand[0], player.z - tc.stand[1]) < 1.4) {
          st.setSearchTarget(null);
          st.openPanel('product', tc.id);
        }
      }
    }

    if (input.interact !== lastInteract.current) {
      lastInteract.current = input.interact;
      if (!blocked) {
        if (st.aimId) st.openPanel('product', st.aimId);
        else if (st.inCheckoutZone) st.openPanel('checkout');
      }
    }
  });

  function nearestCluster(id) {
    const v = placements.get(id);
    if (!v) return null;
    let best = null, bd = Infinity;
    for (const c of v.clusters) {
      const d = Math.hypot(player.x - c.stand[0], player.z - c.stand[1]);
      if (d < bd) { bd = d; best = { id, ...c }; }
    }
    return best;
  }

  return (
    <>
      <group ref={group} position={[SPAWN.x, 0, SPAWN.z]}>
        <group scale={0.88}><Shopper walkRef={walk} /></group>
        <ShoppingCart />
      </group>
      <Flights />
    </>
  );
}
