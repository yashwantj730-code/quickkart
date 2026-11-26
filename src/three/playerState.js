// Shared mutable state between the 3D loop and DOM HUD (no React re-renders per frame).
import { SPAWN } from './layout.js';

export const player = { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, pitch: 0.12, speed: 0 };
export const input = {
  keys: new Set(),
  joy: { x: 0, y: 0 }, // joystick: y forward, x turn
  lookDX: 0, lookDY: 0, // accumulated drag deltas
  interact: 0, // incremented by E key / tap
};
export const nav = { path: [] }; // current guide path for the minimap
export const flights = []; // { productId, from:[x,y,z], t0, color, shape }

export const world = { placements: null };

// Launch the "fly into cart" animation from the nearest shelf cluster of a product.
export function launchFly(productId, color, count = 1) {
  const v = world.placements?.get(productId);
  if (!v) return;
  let best = v.clusters[0], bd = Infinity;
  for (const c of v.clusters) {
    const d = Math.hypot(c.center[0] - player.x, c.center[2] - player.z);
    if (d < bd) { bd = d; best = c; }
  }
  for (let i = 0; i < Math.min(count, 4); i++) flights.push({ productId, from: [...best.center], t0: performance.now() + i * 90, color });
}
