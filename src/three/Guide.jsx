import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { findPath } from './layout.js';
import { player, nav } from './playerState.js';
import { useStore } from '../state/store.js';

const MAX = 120;
const chevGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.18, -0.12); s.lineTo(0, 0.1); s.lineTo(0.18, -0.12); s.lineTo(0.18, -0.02); s.lineTo(0, 0.2); s.lineTo(-0.18, -0.02); s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
})();

export function Guide({ placements }) {
  const target = useStore((s) => s.searchTarget);
  const chev = useRef();
  const beacon = useRef();
  const arrow = useRef();
  const timer = useRef(0);
  const goal = useRef(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd60a', transparent: true, opacity: 0.95, depthWrite: false }), []);

  useEffect(() => { timer.current = 999; if (!target) { nav.path = []; if (chev.current) chev.current.count = 0; } }, [target]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (!target) {
      if (beacon.current) beacon.current.visible = false;
      if (arrow.current) arrow.current.visible = false;
      return;
    }
    timer.current += dt;
    if (timer.current > 0.35) {
      timer.current = 0;
      const v = placements.get(target);
      if (!v) return;
      let best = v.clusters[0], bd = Infinity;
      for (const c of v.clusters) { const d = Math.hypot(player.x - c.stand[0], player.z - c.stand[1]); if (d < bd) { bd = d; best = c; } }
      goal.current = best;
      const path = findPath([player.x, player.z], best.stand);
      nav.path = path;
      // place chevrons along the path
      const o = new THREE.Object3D(); let n = 0;
      for (let i = 0; i < path.length - 1 && n < MAX; i++) {
        const [ax, az] = path[i], [bx, bz] = path[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(bx - ax, bz - az);
        for (let d = i === 0 ? 1.2 : 0.3; d < len && n < MAX; d += 0.7) {
          o.position.set(ax + ((bx - ax) * d) / len, 0.02, az + ((bz - az) * d) / len);
          o.rotation.set(0, yaw + Math.PI, 0); // shape points to -z local after rotateX; flip
          o.updateMatrix(); chev.current.setMatrixAt(n++, o.matrix);
        }
      }
      chev.current.count = n;
      chev.current.instanceMatrix.needsUpdate = true;
    }
    mat.opacity = 0.65 + Math.sin(t * 6) * 0.3;
    const g = goal.current;
    if (g && beacon.current) {
      beacon.current.visible = true;
      beacon.current.position.set(g.center[0], 0, g.center[2]);
      beacon.current.children[0].scale.setScalar(1 + (Math.sin(t * 4) + 1) * 0.15);
      beacon.current.children[1].position.y = 2.75 + Math.sin(t * 3) * 0.12;
    }
    if (arrow.current && nav.path.length > 1) {
      const [nx, nz] = nav.path[1];
      arrow.current.visible = true;
      arrow.current.position.set(player.x, 2.35 + Math.sin(t * 4) * 0.06, player.z);
      arrow.current.rotation.y = Math.atan2(nx - player.x, nz - player.z);
    }
  });

  return (
    <group>
      <instancedMesh ref={chev} args={[chevGeo, mat, MAX]} raycast={() => null} frustumCulled={false} />
      <group ref={beacon} visible={false}>
        <mesh position={[0, 1.4, 0]} raycast={() => null}><cylinderGeometry args={[0.35, 0.35, 2.8, 20, 1, true]} /><meshBasicMaterial color="#ffd60a" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, 2.75, 0]} rotation-x={Math.PI} raycast={() => null}><coneGeometry args={[0.22, 0.42, 4]} /><meshBasicMaterial color="#ffd60a" /></mesh>
      </group>
      <group ref={arrow} visible={false}>
        <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.25]} raycast={() => null}><coneGeometry args={[0.16, 0.38, 3]} /><meshBasicMaterial color="#ffd60a" /></mesh>
        <mesh rotation-x={Math.PI / 2} position={[0, 0, -0.02]} raycast={() => null}><cylinderGeometry args={[0.05, 0.05, 0.3, 6]} /><meshBasicMaterial color="#ffd60a" /></mesh>
      </group>
    </group>
  );
}
