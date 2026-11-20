import { BLOCKS, CIRCLES, POOL, WALKABLE, inRect } from "./layout";

// Where a person can stand, and the way from one place to another: a grid over the resort and
// the field (half a metre a cell), searched with A*, then straightened so the walk looks natural.
// Used to walk you to a counter when you tap "Go" (or Check in now, etc.).

/** A person's radius (they keep this far from walls). */
export const R = 0.3;

/** Can someone stand here? (inside the walkable areas, clear of walls, buildings, furniture) */
export function free(x: number, z: number, r = R) {
  if (!WALKABLE.some((w) => inRect(w, x, z))) return false;
  for (const b of BLOCKS) if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return false;
  for (const c of CIRCLES) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false;
  return true;
}

// the grid covers the compound, the field and the pavement by the gate
const X0 = -100, X1 = 46, Z0 = -50, Z1 = 12, S = 0.5;
const NX = Math.ceil((X1 - X0) / S), NZ = Math.ceil((Z1 - Z0) / S);
let open: Uint8Array | null = null;

function grid() {
  if (open) return open;
  open = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) open[j * NX + i] = free(X0 + (i + 0.5) * S, Z0 + (j + 0.5) * S, R + 0.08) ? 1 : 0;
  return open;
}

const toCell = (x: number, z: number) => [Math.floor((x - X0) / S), Math.floor((z - Z0) / S)] as const;
const centre = (i: number, j: number) => [X0 + (i + 0.5) * S, Z0 + (j + 0.5) * S] as const;

/** The nearest open cell to (i, j), searching outwards a few cells. */
function nearestOpen(i: number, j: number, g: Uint8Array) {
  for (let r = 0; r <= 6; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < NX && b < NZ && g[b * NX + a]) return [a, b] as const;
      }
  return null;
}

/** A clear straight line between two points, with room to spare (checked every 20 cm)? */
function clear(ax: number, az: number, bx: number, bz: number, avoidPool: boolean) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
  for (let k = 1; k < n; k++) {
    const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
    if (!free(x, z, R + 0.18)) return false;
    if (avoidPool && inRect(POOL, x, z)) return false;
  }
  return true;
}

/** The way from a to b, as waypoints (null if there's no way, or either end is off the grid). */
export function findPath(ax: number, az: number, bx: number, bz: number): [number, number][] | null {
  // round the pool if there's a dry way; through the water only if there isn't
  return search(ax, az, bx, bz, true) ?? search(ax, az, bx, bz, false);
}

function search(ax: number, az: number, bx: number, bz: number, dry: boolean): [number, number][] | null {
  const g = grid();
  const [si0, sj0] = toCell(ax, az);
  const [ti0, tj0] = toCell(bx, bz);
  if (si0 < 0 || sj0 < 0 || si0 >= NX || sj0 >= NZ || ti0 < 0 || tj0 < 0 || ti0 >= NX || tj0 >= NZ) return null;
  const s = nearestOpen(si0, sj0, g), t = nearestOpen(ti0, tj0, g);
  if (!s || !t) return null;
  const start = s[1] * NX + s[0], goal = t[1] * NX + t[0];
  // round the pool, not through it (unless that's where you're going, or where you are)
  const avoidPool = dry && !inRect(POOL, bx, bz) && !inRect(POOL, ax, az);
  const cost = new Float32Array(NX * NZ).fill(Infinity);
  const from = new Int32Array(NX * NZ).fill(-1);
  const done = new Uint8Array(NX * NZ);
  // a binary heap of [f, cell]
  const heap: [number, number][] = [];
  const push = (f: number, c: number) => {
    heap.push([f, c]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1, r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  const h = (c: number) => {
    const dx = Math.abs((c % NX) - t[0]), dz = Math.abs(Math.floor(c / NX) - t[1]);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  cost[start] = 0;
  push(h(start), start);
  while (heap.length) {
    const [, c] = pop();
    if (c === goal) break;
    if (done[c]) continue;
    done[c] = 1;
    const ci = c % NX, cj = Math.floor(c / NX);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const a = ci + di, b = cj + dj;
        if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
        const n = b * NX + a;
        if (!g[n] || done[n]) continue;
        if (avoidPool) {
          const [px, pz] = centre(a, b);
          if (inRect(POOL, px, pz)) continue;
        }
        // no cutting corners past a wall
        if (di && dj && (!g[cj * NX + a] || !g[b * NX + ci])) continue;
        const nc = cost[c] + (di && dj ? 1.414 : 1);
        if (nc < cost[n]) {
          cost[n] = nc;
          from[n] = c;
          push(nc + h(n), n);
        }
      }
  }
  if (from[goal] < 0 && goal !== start) return null;
  const cells: [number, number][] = [];
  for (let c = goal; c >= 0; c = from[c]) {
    const [x, z] = centre(c % NX, Math.floor(c / NX));
    cells.push([x, z]);
    if (c === start) break;
  }
  cells.reverse();
  cells.push([bx, bz]);
  // straighten: from each point, head for the furthest one you can see
  const out: [number, number][] = [];
  let cx = ax, cz = az;
  let k = 0;
  while (k < cells.length) {
    let far = k;
    for (let m = cells.length - 1; m > k; m--)
      if (clear(cx, cz, cells[m][0], cells[m][1], avoidPool)) {
        far = m;
        break;
      }
    out.push(cells[far]);
    [cx, cz] = cells[far];
    k = far + 1;
  }
  return out;
}
