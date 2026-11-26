// Procedural supermarket layout. Units = metres. +y up. Entrance at +z.
export const BOUNDS = { minX: -20, maxX: 20, minZ: -16, maxZ: 16, height: 4.6 };

export const CAT_STYLE = {
  'fruits-vegetables': { color: '#2e9d3a', label: 'Fruits & Vegetables', icon: '🥦' },
  'dairy-bread': { color: '#1e88e5', label: 'Dairy & Bread', icon: '🥛' },
  snacks: { color: '#f57c00', label: 'Snacks & Munchies', icon: '🍿' },
  'cold-drinks': { color: '#d32f2f', label: 'Cold Drinks', icon: '🥤' },
  'instant-food': { color: '#8e24aa', label: 'Instant Food', icon: '🍜' },
  'personal-care': { color: '#00897b', label: 'Personal Care', icon: '🧴' },
  household: { color: '#3949ab', label: 'Household', icon: '🧽' },
};

const SHELF_LEVELS = [0.32, 0.92, 1.52];
const FRIDGE_LEVELS = [0.42, 1.02, 1.62];

// Each fixture: AABB (x,z centre + w along x, d along z, h) plus product faces.
// face: { n:[nx,nz], o:[x,z] face centre at the front edge, a:[ax,az] along-axis, len, levels, inset }
export const FIXTURES = [
  ...[
    { x: -9, cat: 'snacks', aisle: 'A2' },
    { x: -3, cat: 'instant-food', aisle: 'A3' },
    { x: 3, cat: 'personal-care', aisle: 'A4' },
    { x: 9, cat: 'household', aisle: 'A5' },
  ].map((g) => ({
    id: `gondola-${g.aisle}`, type: 'gondola', category: g.cat, aisle: g.aisle,
    x: g.x, z: -4, w: 1.4, d: 10, h: 2.15,
    faces: [
      { n: [1, 0], o: [g.x + 0.7, -4], a: [0, 1], len: 9.4, levels: SHELF_LEVELS, inset: 0.28 },
      { n: [-1, 0], o: [g.x - 0.7, -4], a: [0, -1], len: 9.4, levels: SHELF_LEVELS, inset: 0.28 },
    ],
    sign: { pos: [g.x, 3.15, 1.4], rotY: 0 },
  })),
  {
    id: 'produce', type: 'produce', category: 'fruits-vegetables', aisle: 'A1',
    x: -17.3, z: -3, w: 2.6, d: 12, h: 1.2,
    faces: [{ n: [1, 0], o: [-16.0, -3], a: [0, 1], len: 11.2, levels: [0.86, 1.12], inset: 0.4, tiers: true }],
    sign: { pos: [-17, 3.15, 3.4], rotY: 0 },
  },
  {
    id: 'fridge-dairy', type: 'fridge', category: 'dairy-bread', aisle: 'F1',
    x: -6, z: -15.3, w: 14, d: 1.3, h: 2.35,
    faces: [{ n: [0, 1], o: [-6, -14.65], a: [1, 0], len: 13.2, levels: FRIDGE_LEVELS, inset: 0.3 }],
    sign: { pos: [-6, 3.15, -14.4], rotY: 0 },
  },
  {
    id: 'fridge-drinks', type: 'fridge', category: 'cold-drinks', aisle: 'F2',
    x: 19.3, z: -4, w: 1.3, d: 12, h: 2.35,
    faces: [{ n: [-1, 0], o: [18.65, -4], a: [0, -1], len: 11.2, levels: FRIDGE_LEVELS, inset: 0.3 }],
    sign: { pos: [18.4, 3.15, -4], rotY: -Math.PI / 2 },
  },
];

export const COUNTERS = [
  { id: 'counter-1', x: -12, z: 11.6, w: 3.2, d: 0.9, h: 1.0 },
  { id: 'counter-2', x: -6.5, z: 11.6, w: 3.2, d: 0.9, h: 1.0 },
];
// Where the shopper stands to check out (store side of the counter)
export const CHECKOUT_ZONES = COUNTERS.map((c) => ({ x: c.x, z: c.z - 1.6 }));

export const SPAWN = { x: 4, z: 12.2, yaw: Math.PI };
export const DOOR = { x: 4, width: 6 };

// Solid obstacles for collision (x,z,w,d) - includes counters and cashier area.
export const OBSTACLES = [
  ...FIXTURES.map((f) => ({ x: f.x, z: f.z, w: f.w, d: f.d })),
  ...COUNTERS.map((c) => ({ x: c.x, z: c.z + 0.4, w: c.w, d: c.d + 1.8 })),
];

export const SHAPES = {
  box: { kind: 'box', size: [0.24, 0.32, 0.1] },
  pack: { kind: 'box', size: [0.12, 0.24, 0.12] },
  bag: { kind: 'box', size: [0.26, 0.32, 0.09] },
  bottle: { kind: 'cyl', r: 0.055, h: 0.32 },
  can: { kind: 'cyl', r: 0.045, h: 0.15 },
  jar: { kind: 'cyl', r: 0.07, h: 0.14 },
  tub: { kind: 'cyl', r: 0.085, h: 0.1 },
  fruit: { kind: 'sphere', r: 0.075 },
};
export const shapeWidth = (s) => {
  const d = SHAPES[s] || SHAPES.box;
  return d.kind === 'box' ? d.size[0] : d.r * 2;
};
export const shapeHeight = (s) => {
  const d = SHAPES[s] || SHAPES.box;
  return d.kind === 'box' ? d.size[1] : d.kind === 'cyl' ? d.h : d.r * 2;
};

/**
 * Assign every product a set of shelf clusters.
 * Returns Map productId -> { clusters: [{ center:[x,y,z], n:[nx,nz], copies:[[x,y,z]...], tag:[x,y,z], stand:[x,z], yaw }] }
 */
export function computePlacements(products) {
  const out = new Map();
  const byCat = {};
  products.forEach((p) => { (byCat[p.category] ||= []).push(p); });
  Object.values(byCat).forEach((arr) => arr.sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)));

  for (const fx of FIXTURES) {
    const list = byCat[fx.category] || [];
    if (!list.length) continue;
    const F = fx.faces.length;
    const L = fx.faces[0].levels.length;
    const perFace = Math.ceil(list.length / F);
    const cols = Math.max(1, Math.ceil(perFace / L));
    const totalSlots = F * L * cols;
    for (let s = 0; s < totalSlots; s++) {
      const p = list[s % list.length]; // repeat products to fill shelves
      const face = fx.faces[s % F];
      const j = Math.floor(s / F);
      const level = fx.type === 'produce' ? j % L : j % L;
      const col = Math.floor(j / L);
      const slotW = face.len / cols;
      const along = -face.len / 2 + slotW * (col + 0.5);
      const [nx, nz] = face.n;
      const [ax, az] = face.a;
      const cx = face.o[0] + ax * along - nx * face.inset * (fx.type === 'produce' && level === 1 ? 2.2 : 1);
      const cz = face.o[1] + az * along - nz * face.inset * (fx.type === 'produce' && level === 1 ? 2.2 : 1);
      const y = face.levels[level];
      const w = shapeWidth(p.shape) + (p.shape === 'fruit' ? 0.01 : 0.03);
      const usable = slotW - 0.25;
      const copies = [];
      if (p.shape === 'fruit') {
        // heap in a crate: 2 rows deep, pyramid
        const n = Math.min(14, Math.floor(usable / w));
        for (let i = 0; i < n; i++) {
          const t = -((n - 1) * w) / 2 + i * w;
          for (let r = 0; r < 3; r++) {
            const back = (r - 1) * w;
            const lift = r === 1 ? 0.05 : 0;
            copies.push([cx + ax * t - nx * back, y + 0.08 + lift, cz + az * t - nz * back]);
          }
        }
      } else {
        const n = Math.max(1, Math.min(12, Math.floor(usable / w)));
        for (let i = 0; i < n; i++) {
          const t = -((n - 1) * w) / 2 + i * w;
          copies.push([cx + ax * t, y + shapeHeight(p.shape) / 2, cz + az * t]);
        }
      }
      const yaw = Math.atan2(nx, nz);
      const tag = [face.o[0] + ax * along + nx * 0.012, y - 0.07, face.o[1] + az * along + nz * 0.012];
      const stand = [face.o[0] + ax * along + nx * 1.75, face.o[1] + az * along + nz * 1.75];
      const entry = out.get(p.id) || { clusters: [] };
      entry.clusters.push({ center: [cx, y + 0.15, cz], n: face.n, copies, tag, stand, yaw, fixture: fx.id, aisle: fx.aisle });
      out.set(p.id, entry);
    }
  }
  return out;
}

// ---------- collision ----------
const PLAYER_R = 0.3;
const CART_R = 0.42;
export const CART_OFFSET = 0.95;

function circleHitsBox(x, z, r, b) {
  const hx = b.w / 2, hz = b.d / 2;
  const dx = Math.max(Math.abs(x - b.x) - hx, 0);
  const dz = Math.max(Math.abs(z - b.z) - hz, 0);
  return dx * dx + dz * dz < r * r;
}
function circleBlocked(x, z, r) {
  if (x - r < BOUNDS.minX + 0.15 || x + r > BOUNDS.maxX - 0.15 || z - r < BOUNDS.minZ + 0.15 || z + r > BOUNDS.maxZ - 0.15) return true;
  for (const b of OBSTACLES) if (circleHitsBox(x, z, r, b)) return true;
  return false;
}
export function shopperBlocked(x, z, yaw) {
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  return circleBlocked(x, z, PLAYER_R) || circleBlocked(x + fx * CART_OFFSET, z + fz * CART_OFFSET, CART_R);
}
export function pointInsideSolid(x, z, pad = 0.15) {
  if (x < BOUNDS.minX + pad || x > BOUNDS.maxX - pad || z < BOUNDS.minZ + pad || z > BOUNDS.maxZ - pad) return true;
  return OBSTACLES.some((b) => Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad);
}

// ---------- path finding (grid A*) ----------
const CELL = 0.5;
const GW = Math.round((BOUNDS.maxX - BOUNDS.minX) / CELL);
const GH = Math.round((BOUNDS.maxZ - BOUNDS.minZ) / CELL);
let grid = null;
function buildGrid() {
  grid = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = BOUNDS.minX + (i + 0.5) * CELL, z = BOUNDS.minZ + (j + 0.5) * CELL;
    grid[j * GW + i] = circleBlocked(x, z, 0.55) ? 1 : 0;
  }
}
const toCell = (x, z) => [Math.min(GW - 1, Math.max(0, Math.floor((x - BOUNDS.minX) / CELL))), Math.min(GH - 1, Math.max(0, Math.floor((z - BOUNDS.minZ) / CELL)))];
const free = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && !grid[j * GW + i];
function nearestFree(i, j) {
  if (free(i, j)) return [i, j];
  for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (free(i + di, j + dj)) return [i + di, j + dj];
  return [i, j];
}
function lineFree(a, b) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2) + 1;
  for (let s = 0; s <= steps; s++) {
    const x = a[0] + ((b[0] - a[0]) * s) / steps, z = a[1] + ((b[1] - a[1]) * s) / steps;
    const [i, j] = toCell(x, z);
    if (!free(i, j)) return false;
  }
  return true;
}
export function findPath(from, to) {
  if (!grid) buildGrid();
  const [si, sj] = nearestFree(...toCell(from[0], from[1]));
  const [ti, tj] = nearestFree(...toCell(to[0], to[1]));
  const N = GW * GH;
  const g = new Float32Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const open = [[0, sj * GW + si]];
  g[sj * GW + si] = 0;
  const target = tj * GW + ti;
  const h = (k) => Math.hypot((k % GW) - ti, Math.floor(k / GW) - tj);
  let found = false, iter = 0;
  while (open.length && iter++ < 8000) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
    const [, cur] = open.splice(bi, 1)[0];
    if (cur === target) { found = true; break; }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const ci = cur % GW, cj = Math.floor(cur / GW);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (!free(ni, nj) || (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj)))) continue;
      const nk = nj * GW + ni;
      const ng = g[cur] + (di && dj ? 1.414 : 1);
      if (ng < g[nk]) { g[nk] = ng; came[nk] = cur; open.push([ng + h(nk), nk]); }
    }
  }
  if (!found) return [from, to];
  const cells = [];
  for (let k = target; k !== -1; k = came[k]) cells.push([BOUNDS.minX + ((k % GW) + 0.5) * CELL, BOUNDS.minZ + (Math.floor(k / GW) + 0.5) * CELL]);
  cells.reverse();
  cells[0] = from; cells[cells.length - 1] = to;
  // string-pull smoothing
  const pts = [cells[0]];
  let anchor = 0;
  for (let k = 2; k < cells.length; k++) {
    if (!lineFree(cells[anchor], cells[k])) { pts.push(cells[k - 1]); anchor = k - 1; }
  }
  pts.push(cells[cells.length - 1]);
  return pts;
}
