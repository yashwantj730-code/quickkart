import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SHAPES } from './layout.js';
import { labelTexture, wrapTexture, priceTagTexture } from './textures.js';
import { useStore } from '../state/store.js';
import { player } from './playerState.js';

const geoCache = {};
function geometryFor(shape) {
  if (geoCache[shape]) return geoCache[shape];
  const d = SHAPES[shape] || SHAPES.box;
  let g;
  if (d.kind === 'box') g = new THREE.BoxGeometry(...d.size);
  else if (d.kind === 'cyl') g = new THREE.CylinderGeometry(d.r * (shape === 'bottle' ? 0.92 : 1), d.r, d.h, 14);
  else g = new THREE.SphereGeometry(d.r, 12, 10);
  geoCache[shape] = g;
  return g;
}
const tagGeo = new THREE.PlaneGeometry(0.34, 0.095);
const crateGeo = new THREE.BoxGeometry(1, 0.12, 0.5);
const crateMat = new THREE.MeshStandardMaterial({ color: '#a1887f', roughness: 0.9 });

function materialsFor(p) {
  const d = SHAPES[p.shape] || SHAPES.box;
  const base = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.6 });
  if (d.kind === 'box') {
    const label = new THREE.MeshStandardMaterial({ map: labelTexture(p), roughness: 0.55 });
    const top = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.color).multiplyScalar(0.85), roughness: 0.6 });
    return [base, base, top, top, label, base];
  }
  if (d.kind === 'cyl') {
    const wrap = new THREE.MeshStandardMaterial({ map: wrapTexture(p), roughness: 0.4 });
    const cap = new THREE.MeshStandardMaterial({ color: p.shape === 'can' ? '#cfd8dc' : '#fafafa', metalness: p.shape === 'can' ? 0.6 : 0, roughness: 0.4 });
    return [wrap, cap, cap];
  }
  return [new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.45 })];
}

const MAX_PICK_DIST = 4.8;

function ProductGroup({ product, placement, highlighted, onHover }) {
  const ref = useRef();
  const mats = useMemo(() => materialsFor(product), [product]);
  const tagMat = useMemo(() => new THREE.MeshBasicMaterial({ map: priceTagTexture(product), toneMapped: false }), [product]);
  const copies = useMemo(() => placement.clusters.flatMap((c) => c.copies.map((pos) => ({ pos, yaw: c.yaw }))), [placement]);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    copies.forEach((c, i) => {
      o.position.set(...c.pos);
      o.rotation.set(0, c.yaw + (product.shape === 'fruit' ? i * 1.7 : 0), 0);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [copies, product.shape]);

  useEffect(() => {
    mats.forEach((m) => { m.emissive = new THREE.Color(highlighted ? '#ffd60a' : '#000000'); m.emissiveIntensity = highlighted ? 0.22 : 0; });
  }, [highlighted, mats]);

  useEffect(() => () => { mats.forEach((m) => m.dispose()); tagMat.dispose(); }, [mats, tagMat]);

  const handleClick = (e) => {
    if (e.delta > 8) return; // it was a drag-to-look
    e.stopPropagation();
    const d = Math.hypot(e.point.x - player.x, e.point.z - player.z);
    const st = useStore.getState();
    if (d > MAX_PICK_DIST) {
      st.setSearchTarget(product.id);
      st.toast(`Walk closer to pick ${product.name} - follow the arrows`, 'info', '🧭');
      return;
    }
    st.openPanel('product', product.id);
  };

  return (
    <group>
      <instancedMesh
        ref={ref}
        args={[geometryFor(product.shape), mats, copies.length]}
        onPointerOver={(e) => { e.stopPropagation(); onHover(product.id); }}
        onPointerOut={() => onHover(null)}
        onClick={handleClick}
      />
      {placement.clusters.map((c, i) => (
        <mesh key={i} geometry={tagGeo} material={tagMat} position={c.tag} rotation-y={c.yaw} onClick={handleClick} />
      ))}
      {product.shape === 'fruit' && placement.clusters.map((c, i) => (
        <mesh key={`c${i}`} geometry={crateGeo} material={crateMat} position={[c.center[0], c.center[1] - 0.12, c.center[2]]} rotation-y={c.yaw} scale={[Math.min(2.6, (c.copies.length / 3) * 0.16 + 0.12), 1, 1]} raycast={() => null} />
      ))}
    </group>
  );
}

export function Products({ placements, hoverId, setHoverId }) {
  const products = useStore((s) => s.products);
  const aimId = useStore((s) => s.aimId);
  const target = useStore((s) => s.searchTarget);
  useEffect(() => {
    document.body.style.cursor = hoverId ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [hoverId]);
  return (
    <group>
      {products.map((p) => placements.get(p.id) && (
        <ProductGroup key={p.id} product={p} placement={placements.get(p.id)} highlighted={hoverId === p.id || aimId === p.id || target === p.id} onHover={setHoverId} />
      ))}
    </group>
  );
}
