# BUILD_NOTES: QuickKart 3D

Status: **feature-complete locally, not deployed** (deployment is a separate task).

## Verified (2026-11-26)
- `npm install && npm run build`: clean (no errors). A fresh `NODE_ENV=production npm install` also builds, since all build deps are in `dependencies`.
- `scripts/api-test.mjs`: **36/36 pass** against both the local JSON store and a real MongoDB 7 (mongodb-memory-server, `NODE_ENV=production`).
- Concurrency: 8 parallel orders for an item with stock 4 gave exactly 4×201 and 4×409, ending at stock 0 (no oversell, Mongo).
- Restart against an existing DB does not re-seed products (seed-if-empty works). The admin is upserted from env.
- Headless Chromium (SwiftShader WebGL2) via `scripts/ui-smoke.mjs`: the 3D canvas renders, search+teleport opens the product card, add-to-cart flies into the cart, E-to-pick works, guide arrows work, and checkout → demo login → place order → success tracker → My Orders all work. Admin login, dashboard, products, order status change and users work. **No console errors or CSP violations.** No horizontal overflow at 375px (3D, list, checkout, admin).
- FPS could not be measured meaningfully (software GL in headless ran at ~10 fps). Real-GPU performance is untested. Expected to be fine (~1.2k instances in ~64 instanced draws, one shadow-casting light, adaptive DPR via PerformanceMonitor).

## Deploy checklist (Render, single web service)
- Build: `npm install && npm run build` · Start: `npm start`
- Env: `MONGODB_URI` (Atlas, db `quickkart`), `JWT_SECRET` (long random), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `NODE_ENV=production`. Render sets `PORT`.
- Atlas network access must allow Render's egress IPs (or 0.0.0.0/0).
- `trust proxy` is set to 1 (correct for Render), so rate limits key on the real client IP.

## Known gaps / ideas
- The order status ticker runs in-process (setInterval every 10 s: Packed at 1 min, Out at 3 min, Delivered at 10 min). On a sleeping free Render instance it catches up when the instance next wakes.
- The JSON fallback store is single-process only. It is meant for local runs; production should set `MONGODB_URI`.
- Rate limiting is in-memory (per instance). Use a shared store if scaling to several instances.
- No CSRF token. Mitigated by SameSite=Strict cookies, JSON-only bodies and an Origin check on mutating `/api` requests.
- Order cancel / admin cancel restock is not transactional (two quick cancels are guarded by status checks, but there's no Mongo transaction).
- Product images are emoji + colour swatches (no photo assets). 3D labels need an emoji font on the device (standard on all modern OSes).
- Admin product shelf placement is derived from category + `slot`. The `aisle` field is informational.
- Bundle: the 3D chunk is ~850 KB (230 KB gzip) and the admin chunk ~450 KB (recharts). Both are lazy-loaded.
- Not done: email/SMS notifications, real payment gateway (intentionally), automated unit tests for the frontend, i18n.

## Files of note
- `server/app.js`: security middleware, routing, static + SPA fallback
- `server/routes/orders.js`: server-side pricing + atomic stock logic
- `server/db/{mongo,memory}.js`: two repository implementations behind one interface
- `src/three/layout.js`: store layout, shelf placement, collision, A* path-finding
