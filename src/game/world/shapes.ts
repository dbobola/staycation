import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Shapes built in code: hip roofs, palms, shade trees, cars, chairs.

/**
 * A hip roof over a w × d rectangle (centred, base at y = 0), rising h, with a ridge along the
 * longer side (a pyramid when square). UVs are in metres, for repeating textures.
 */
export function hipRoof(w: number, d: number, h: number) {
  const hw = w / 2, hd = d / 2;
  const alongX = w >= d;
  const r = alongX ? (w - d) / 2 : (d - w) / 2;
  const A = alongX ? new THREE.Vector3(-r, h, 0) : new THREE.Vector3(0, h, -r);
  const B = alongX ? new THREE.Vector3(r, h, 0) : new THREE.Vector3(0, h, r);
  const c = [new THREE.Vector3(-hw, 0, -hd), new THREE.Vector3(hw, 0, -hd), new THREE.Vector3(hw, 0, hd), new THREE.Vector3(-hw, 0, hd)];
  const tris: THREE.Vector3[][] = [];
  if (alongX) {
    tris.push([c[0], A, B], [c[0], B, c[1]]); // north (−z)
    tris.push([c[2], B, A], [c[2], A, c[3]]); // south
    tris.push([c[1], B, c[2]]); // east
    tris.push([c[3], A, c[0]]); // west
  } else {
    tris.push([c[1], B, A], [c[1], A, c[0]]);
    tris.push([c[3], A, B], [c[3], B, c[2]]);
    tris.push([c[0], A, c[3]]);
    tris.push([c[2], B, c[1]]);
  }
  const pos: number[] = [];
  const uv: number[] = [];
  for (const t of tris) {
    // keep the winding facing outward (upward)
    const n = new THREE.Vector3().subVectors(t[1], t[0]).cross(new THREE.Vector3().subVectors(t[2], t[0]));
    const tri = n.y < 0 ? [t[0], t[2], t[1]] : t;
    // uv along the slope: u = position along the eave, v = distance up the slope
    const eave = new THREE.Vector3().subVectors(t[0], t[0]);
    void eave;
    for (const p of tri) {
      pos.push(p.x, p.y, p.z);
      const horiz = Math.abs(n.x) > Math.abs(n.z) ? p.z : p.x;
      uv.push(horiz / 2, (p.y / h) * Math.hypot(h, Math.min(hw, hd)) / 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function colored(g: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  const out = g.index ? g.toNonIndexed() : g;
  out.setAttribute("color", new THREE.BufferAttribute(n === out.attributes.position.count ? arr : expand(arr, out.attributes.position.count, c), 3));
  out.deleteAttribute("uv");
  return out;
}
function expand(_arr: Float32Array, n: number, c: THREE.Color) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  return a;
}

/** A coconut / fan palm about 6 m tall (vertex coloured, origin at the foot of the trunk). */
export function palmGeometry(seed = 1) {
  const parts: THREE.BufferGeometry[] = [];
  const H = 5.6;
  const lean = 0.35 * (seed % 2 ? 1 : -1);
  // trunk: stacked, slightly curved segments with rings
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const y0 = t0 * H, y1 = t1 * H;
    const cyl = new THREE.CylinderGeometry(0.17 - t1 * 0.05, 0.2 - t0 * 0.05, y1 - y0, 7, 1);
    const x = lean * t0 * t0 * 1.6;
    cyl.translate(x, (y0 + y1) / 2, 0);
    parts.push(colored(cyl, i % 2 ? "#7a6a55" : "#6c5d4a"));
  }
  const top = new THREE.Vector3(lean * 1.6, H, 0);
  // fronds: long, drooping, tapering leaves
  const fronds = 11;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + seed;
    const len = 2.6 + ((i * 7 + seed) % 5) * 0.18;
    const shape = new THREE.BufferGeometry();
    const pts: number[] = [];
    const N = 6;
    for (let k = 0; k < N; k++) {
      const s0 = k / N, s1 = (k + 1) / N;
      const w0 = Math.sin(Math.PI * Math.min(1, s0 * 1.15 + 0.05)) * 0.45;
      const w1 = Math.sin(Math.PI * Math.min(1, s1 * 1.15 + 0.05)) * 0.45;
      const y0 = Math.sin(s0 * 1.4) * 0.9 - s0 * s0 * 2.1;
      const y1 = Math.sin(s1 * 1.4) * 0.9 - s1 * s1 * 2.1;
      const x0 = s0 * len, x1 = s1 * len;
      pts.push(x0, y0, -w0, x1, y1, -w1, x1, y1, w1, x0, y0, -w0, x1, y1, w1, x0, y0, w0);
    }
    shape.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    shape.rotateY(a);
    shape.translate(top.x, top.y, top.z);
    shape.computeVertexNormals();
    parts.push(colored(shape, i % 3 === 0 ? "#4f7a2e" : i % 3 === 1 ? "#5e8a35" : "#3f6a28"));
  }
  const crown = new THREE.SphereGeometry(0.32, 7, 5);
  crown.translate(top.x, top.y - 0.15, top.z);
  parts.push(colored(crown, "#5d4c30"));
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  g.computeVertexNormals();
  return g;
}

/** A broad shade tree (the big mango / almond trees behind the walls). */
export function treeGeometry(seed = 1) {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.28, 0.42, 3.4, 7);
  trunk.translate(0, 1.7, 0);
  parts.push(colored(trunk, "#4e3b2a"));
  const blobs = 7;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + seed;
    const r = i === 0 ? 0 : 1.8 + ((i * 3 + seed) % 3) * 0.4;
    const s = 1.7 + ((i * 5 + seed) % 4) * 0.35;
    const ico = new THREE.IcosahedronGeometry(s, 1);
    ico.translate(Math.cos(a) * r, 4.4 + ((i * 2 + seed) % 3) * 0.5, Math.sin(a) * r);
    parts.push(colored(ico, ["#2f5a26", "#3a6a2c", "#2a4f22", "#44753a"][(i + seed) % 4]));
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  g.computeVertexNormals();
  return g;
}

/** A low shrub (the planters, the bushes by the walls). */
export function shrubGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.IcosahedronGeometry(0.45 + (i % 2) * 0.15, 1);
    s.translate(Math.cos(i * 1.7) * 0.35, 0.4 + (i % 2) * 0.15, Math.sin(i * 1.7) * 0.35);
    parts.push(colored(s, i % 2 ? "#3c6b2f" : "#2f5a27"));
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}

/** A saloon car, about 4.5 m long (body colour applied per instance). Origin on the ground. */
export function carGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(1.8, 0.6, 4.5);
  body.translate(0, 0.6, 0);
  parts.push(colored(body, "#ffffff"));
  const cabin = new THREE.BoxGeometry(1.6, 0.55, 2.3);
  cabin.translate(0, 1.17, -0.2);
  parts.push(colored(cabin, "#ffffff"));
  const glass = new THREE.BoxGeometry(1.62, 0.42, 2.0);
  glass.translate(0, 1.18, -0.2);
  parts.push(colored(glass, "#1c2530"));
  for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) {
    const w = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 10);
    w.rotateZ(Math.PI / 2);
    w.translate(x, 0.33, z);
    parts.push(colored(w, "#151515"));
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}

/** A white metal garden chair (as round the pool). Origin on the ground, facing +z. */
export function metalChairGeometry(color = "#f2f2ee") {
  const parts: THREE.BufferGeometry[] = [];
  const seat = new THREE.BoxGeometry(0.46, 0.04, 0.44);
  seat.translate(0, 0.45, 0);
  parts.push(seat);
  const back = new THREE.BoxGeometry(0.46, 0.42, 0.03);
  back.rotateX(-0.12);
  back.translate(0, 0.7, -0.22);
  parts.push(back);
  for (const [x, z] of [[-0.21, 0.19], [0.21, 0.19], [-0.21, -0.19], [0.21, -0.19]]) {
    const l = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 5);
    l.translate(x, 0.225, z);
    parts.push(l);
  }
  for (const x of [-0.23, 0.23]) {
    const arm = new THREE.BoxGeometry(0.03, 0.03, 0.44);
    arm.translate(x, 0.62, 0);
    parts.push(arm);
  }
  return colored(mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!, color);
}

/** A rattan armchair (the bar). */
export function rattanChairGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const seat = new THREE.BoxGeometry(0.52, 0.1, 0.5);
  seat.translate(0, 0.43, 0);
  parts.push(colored(seat, "#3b2f26"));
  const back = new THREE.BoxGeometry(0.54, 0.5, 0.06);
  back.translate(0, 0.72, -0.24);
  parts.push(colored(back, "#2e251e"));
  for (const x of [-0.26, 0.26]) {
    const arm = new THREE.BoxGeometry(0.06, 0.24, 0.5);
    arm.translate(x, 0.58, 0);
    parts.push(colored(arm, "#2e251e"));
    for (const z of [-0.2, 0.2]) {
      const l = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 5);
      l.translate(x, 0.2, z);
      parts.push(colored(l, "#1b1b1b"));
    }
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}

/** A sun lounger, 2 m long (backrest raised at the head, which is −z). */
export function loungerGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const bed = new THREE.BoxGeometry(0.7, 0.08, 1.3);
  bed.translate(0, 0.32, 0.35);
  parts.push(colored(bed, "#f4f1ea"));
  const back = new THREE.BoxGeometry(0.7, 0.08, 0.8);
  back.rotateX(0.75);
  back.translate(0, 0.55, -0.55);
  parts.push(colored(back, "#f4f1ea"));
  const pad = new THREE.BoxGeometry(0.64, 0.05, 1.25);
  pad.translate(0, 0.39, 0.35);
  parts.push(colored(pad, "#2c8fa0"));
  for (const [x, z] of [[-0.3, 0.9], [0.3, 0.9], [-0.3, -0.3], [0.3, -0.3]]) {
    const l = new THREE.BoxGeometry(0.05, 0.3, 0.05);
    l.translate(x, 0.15, z);
    parts.push(colored(l, "#bdbdbd"));
  }
  return mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}

/** Car glass: blacked out all round, windscreen included (glossy, so it still catches the light). */
export const CAR_GLASS = new THREE.MeshPhysicalMaterial({
  color: "#040506",
  roughness: 0.05,
  metalness: 0.5,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  side: THREE.DoubleSide,
});
export const CAR_WINDSCREEN = CAR_GLASS;
export const LIMO_GLASS = CAR_GLASS;

/**
 * A car, built from its side silhouette: the painted body (the lower body with wheel arches cut
 * out, the roof and the pillars, all in the car's own colour), the glass on its own (windscreen,
 * rear window and the side windows, see-through, so you can see in), and the details in one piece
 * (the cabin inside: seats, dashboard, steering wheel; tyres, rims, lights, grille, plates,
 * mirrors, bumpers). Origin on the ground, nose towards +z.
 */
export function carGeometries(kind: "sedan" | "suv" | "limo") {
  const suv = kind === "suv";
  const limo = kind === "limo";
  // the limousine: a long, low stretch saloon
  const L = limo ? 7.6 : suv ? 4.7 : 4.6;
  const W = limo ? 1.94 : suv ? 1.86 : 1.78;
  const clear = limo ? 0.2 : suv ? 0.32 : 0.24;
  const wheelR = limo ? 0.36 : suv ? 0.37 : 0.33;
  const axle = suv ? 1.42 : 1.38;
  // side profile: x along the car (+ is the nose), y up
  const f = L / 2;
  const axleF = limo ? f - 1.05 : axle;
  const axleR = limo ? -f + 1.15 : -axle;
  type P = [number, number];
  // the greenhouse: where the windscreen meets the bonnet (F), the roof's front and back (RF, RR),
  // and where the rear window meets the boot (R); SUVs have a near-upright tailgate (RT)
  const F: P = limo ? [f - 1.55, 0.86] : suv ? [f - 1.0, 1.08] : [f - 1.25, 0.9];
  const RF: P = limo ? [f - 2.3, 1.36] : suv ? [f - 1.65, 1.72] : [f - 2.0, 1.4];
  const RR: P = limo ? [-f + 1.5, 1.38] : suv ? [-f + 0.3, 1.76] : [-f + 1.3, 1.42];
  const R: P = limo ? [-f + 0.6, 0.96] : suv ? [-f + 0.03, 1.1] : [-f + 0.55, 0.98];
  const RT: P | null = suv ? [-f + 0.04, 1.6] : null;
  const lower: P[] = limo
    ? [[f, clear + 0.14], [f + 0.03, 0.6], [f - 0.2, 0.76], F, R, [-f + 0.1, 0.92], [-f, 0.64], [-f + 0.02, clear + 0.14]]
    : suv
      ? [[f, clear + 0.18], [f + 0.03, 0.72], [f - 0.12, 0.98], F, R, [-f, 1.0], [-f + 0.02, clear + 0.18]]
      : [[f, clear + 0.16], [f + 0.02, 0.62], [f - 0.15, 0.78], F, R, [-f + 0.08, 0.94], [-f, 0.66], [-f + 0.02, clear + 0.16]];
  const s = new THREE.Shape();
  s.moveTo(lower[0][0], lower[0][1]);
  for (const p of lower.slice(1)) s.lineTo(p[0], p[1]);
  // the underside, with arches over the wheels
  const archR = wheelR + 0.06;
  s.lineTo(axleR - archR, clear);
  s.absarc(axleR, wheelR, archR, Math.PI, 0, true);
  s.lineTo(axleF - archR, clear);
  s.absarc(axleF, wheelR, archR, Math.PI, 0, true);
  s.lineTo(lower[0][0], lower[0][1]);
  const bevel = 0.07;
  /** A profile shape extruded across the car's width, turned so profile x runs along the car. */
  const across = (shape: THREE.Shape, width: number, bev = 0) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: width - bev * 2, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -(width - bev * 2) / 2);
    g.rotateY(-Math.PI / 2); // shape x → world z (nose to +z)
    g.deleteAttribute("uv");
    return g.index ? g.toNonIndexed() : g;
  };
  const bodyParts: THREE.BufferGeometry[] = [across(s, W, bevel)];
  // the roof: a thin slab over the cabin
  const roof = new THREE.Shape();
  const top: P[] = RT ? [RF, RR, RT] : [RF, RR];
  roof.moveTo(top[0][0], top[0][1]);
  for (const p of top.slice(1)) roof.lineTo(p[0], p[1]);
  for (const p of [...top].reverse()) roof.lineTo(p[0] + (p === RT ? 0.07 : 0), p[1] - 0.07);
  roof.closePath();
  bodyParts.push(across(roof, W - 0.1, 0.03));
  // pillars: a strip down each edge of the windscreen and the rear window, and the posts between
  // the side windows
  const strip = (a: P, b: P, x: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const g = new THREE.BoxGeometry(0.09, len, 0.09);
    g.rotateX(Math.atan2(b[0] - a[0], b[1] - a[1]));
    g.translate(x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    g.deleteAttribute("uv");
    return g.index ? g.toNonIndexed() : g;
  };
  const beltAt = (z: number) => F[1] + ((R[1] - F[1]) * (F[0] - z)) / (F[0] - R[0]);
  const roofAt = (z: number) => RF[1] + ((RR[1] - RF[1]) * (RF[0] - z)) / (RF[0] - RR[0]);
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.06);
    bodyParts.push(strip(F, RF, x), strip(RT ?? RR, R, x));
    if (RT) bodyParts.push(strip(RR, RT, x));
    for (const z of limo ? [1.0, -0.1, -1.2, -2.3] : suv ? [0.15, -0.95] : [-0.05]) bodyParts.push(strip([z, beltAt(z) - 0.02], [z, roofAt(z) - 0.03], x));
  }
  const body = mergeGeometries(bodyParts)!;
  body.computeVertexNormals();

  // the glass, see-through: windscreen, rear window, and the side windows (each side)
  const quad = (a: P, b: P, half: number) => {
    const g = new THREE.BufferGeometry();
    const v = [
      [-half, a[1], a[0]], [half, a[1], a[0]], [half, b[1], b[0]],
      [-half, a[1], a[0]], [half, b[1], b[0]], [-half, b[1], b[0]],
    ].flat();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  };
  const windscreen = quad(F, RF, W / 2 - 0.08);
  const panes: THREE.BufferGeometry[] = [quad(RT ?? RR, R, W / 2 - 0.08)];
  const sideShape = new THREE.Shape();
  const win: P[] = RT ? [F, RF, RR, RT, R] : [F, RF, RR, R];
  sideShape.moveTo(win[0][0], win[0][1]);
  for (const p of win.slice(1)) sideShape.lineTo(p[0], p[1]);
  sideShape.closePath();
  for (const sx of [-1, 1]) {
    const g = new THREE.ShapeGeometry(sideShape);
    g.rotateY(-Math.PI / 2);
    g.translate(sx * (W / 2 - 0.05), 0, 0);
    g.deleteAttribute("uv");
    panes.push(g.index ? g.toNonIndexed() : g);
  }
  const glass = mergeGeometries(panes.map((p) => {
    if (p.attributes.normal) return p;
    p.computeVertexNormals();
    return p;
  }))!;

  const parts: THREE.BufferGeometry[] = [];
  const floor = clear + 0.28;
  // wheels: tyre, rim, hub
  for (const [x, z] of [[-1, axleR], [1, axleR], [-1, axleF], [1, axleF]]) {
    const tyre = new THREE.CylinderGeometry(wheelR, wheelR, 0.25, 18);
    tyre.rotateZ(Math.PI / 2);
    tyre.translate(x * (W / 2 - 0.13), wheelR, z);
    parts.push(colored(tyre, "#141414"));
    const rim = new THREE.CylinderGeometry(wheelR * 0.62, wheelR * 0.62, 0.26, 10);
    rim.rotateZ(Math.PI / 2);
    rim.translate(x * (W / 2 - 0.12), wheelR, z);
    parts.push(colored(rim, "#b8bcc0"));
    const hub = new THREE.CylinderGeometry(wheelR * 0.18, wheelR * 0.18, 0.27, 8);
    hub.rotateZ(Math.PI / 2);
    hub.translate(x * (W / 2 - 0.115), wheelR, z);
    parts.push(colored(hub, "#5a5e62"));
  }
  // lights, grille, plates, mirrors, bumpers
  const front = f + 0.04;
  for (const x of [-1, 1]) {
    const hl = new THREE.BoxGeometry(0.42, 0.12, 0.06);
    hl.translate(x * (W / 2 - 0.3), suv ? 0.86 : 0.66, front - 0.03);
    parts.push(colored(hl, "#f4f6f8"));
    const tl = new THREE.BoxGeometry(0.36, 0.13, 0.06);
    tl.translate(x * (W / 2 - 0.26), suv ? 1.02 : 0.8, -f - 0.02);
    parts.push(colored(tl, "#b3121a"));
    const mirror = new THREE.BoxGeometry(0.2, 0.12, 0.12);
    mirror.translate(x * (W / 2 + 0.08), suv ? 1.14 : 0.96, f - (suv ? 1.12 : 1.3));
    parts.push(colored(mirror, "#1d1f22"));
  }
  const grille = new THREE.BoxGeometry(W * 0.5, suv ? 0.24 : 0.14, 0.05);
  grille.translate(0, suv ? 0.7 : 0.52, front - 0.02);
  parts.push(colored(grille, "#1a1a1a"));
  for (const [z, y] of [[front, suv ? 0.46 : 0.38], [-f - 0.02, suv ? 0.7 : 0.56]]) {
    const plate = new THREE.BoxGeometry(0.52, 0.12, 0.03);
    plate.translate(0, y, z);
    parts.push(colored(plate, "#e9e9e2"));
  }
  for (const z of [front - 0.02, -f + 0.02]) {
    const bumper = new THREE.BoxGeometry(W - 0.04, 0.16, 0.12);
    bumper.translate(0, clear + 0.1, z);
    parts.push(colored(bumper, "#2a2b2d"));
  }
  if (limo) {
    // chrome: a strip down each side, round the windows, and gold-tinted rims (added over the others)
    for (const x of [-1, 1]) {
      const strip = new THREE.BoxGeometry(0.02, 0.05, L - 0.6);
      strip.translate(x * (W / 2 + 0.065), 0.66, 0);
      parts.push(colored(strip, "#e6e9ec"));
      const sill = new THREE.BoxGeometry(0.02, 0.03, L - 2.9);
      sill.translate(x * (W / 2 + 0.07), 0.9, -0.15);
      parts.push(colored(sill, "#e6e9ec"));
    }
    for (const [x, z] of [[-1, axleR], [1, axleR], [-1, axleF], [1, axleF]]) {
      const rim = new THREE.CylinderGeometry(wheelR * 0.64, wheelR * 0.64, 0.262, 14);
      rim.rotateZ(Math.PI / 2);
      rim.translate(x * (W / 2 - 0.12), wheelR, z);
      parts.push(colored(rim, "#d8c08a"));
    }
    // a hood ornament
    const orn = new THREE.ConeGeometry(0.03, 0.09, 6);
    orn.translate(0, 0.83, f - 0.25);
    parts.push(colored(orn, "#e6e9ec"));
  }
  const detail = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)))!;
  /** Where the driver sits (left-hand drive), for putting a chauffeur at the wheel. */
  const driver = { x: W / 4, z: F[0] - 0.95, floor };
  return { body, detail, glass, windscreen, driver };
}
