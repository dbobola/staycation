import * as THREE from "three";

// Outfits painted over a Rocketbox body in its shader: swimwear for the pool, team kits for the
// football, and the staff polo for the attendants. The avatars' own clothes are baked into one
// texture with their skin, so an outfit replaces that texture with flat skin (sampled from the
// face) and paints garments by height on the body and distance from its centre line.
//
// The bodies' rest pose is Z-up, in metres, arms out along X: so in the vertex shader
// `position.z / height` says how far up the body a point is, and `abs(position.x)` how far out.

export type Outfit =
  | { kind: "swim"; sex: "f" | "m"; color: string }
  | { kind: "kit"; shirt: string; shorts: string; socks: string }
  | { kind: "staff"; shirt: string; trousers: string }
  /** Night-out clothes: a fitted dress (women) or a shirt and trousers (men), plain or in an Ankara print. */
  | { kind: "party"; sex: "f" | "m"; main: string; print?: string; bottom?: string; shoes?: string };

/** pat: a second colour for an Ankara-style print (circles and diamonds), and its scale. */
type Band = { z0: number; z1: number; lat: number; color: THREE.Color; pat?: THREE.Color; scale?: number };

function bands(o: Outfit): Band[] {
  const c = (s: string) => new THREE.Color(s);
  if (o.kind === "swim")
    return o.sex === "m"
      ? [{ z0: 0.43, z1: 0.56, lat: 0.26, color: c(o.color) }]
      : [{ z0: 0.45, z1: 0.76, lat: 0.21, color: c(o.color) }];
  if (o.kind === "kit")
    return [
      { z0: 0.555, z1: 0.83, lat: 0.3, color: c(o.shirt) },
      { z0: 0.41, z1: 0.555, lat: 0.26, color: c(o.shorts) },
      { z0: 0.04, z1: 0.27, lat: 0.26, color: c(o.socks) },
      { z0: -0.1, z1: 0.04, lat: 0.3, color: c("#f2f2f2") },
    ];
  if (o.kind === "party") {
    const pat = o.print ? c(o.print) : undefined;
    return o.sex === "f"
      ? [
          // a fitted dress to mid-thigh, sleeveless, and heels
          { z0: 0.37, z1: 0.79, lat: 0.215, color: c(o.main), pat, scale: 9 },
          { z0: -0.1, z1: 0.035, lat: 0.3, color: c(o.shoes ?? "#141414") },
        ]
      : [
          { z0: 0.555, z1: 0.835, lat: 0.33, color: c(o.main), pat, scale: 8 },
          { z0: 0.03, z1: 0.555, lat: 0.26, color: c(o.bottom ?? "#1c1d22") },
          { z0: -0.1, z1: 0.03, lat: 0.3, color: c(o.shoes ?? "#2a1c14") },
        ];
  }
  return [
    { z0: 0.555, z1: 0.83, lat: 0.32, color: c(o.shirt) },
    { z0: 0.03, z1: 0.555, lat: 0.26, color: c(o.trousers) },
    { z0: -0.1, z1: 0.03, lat: 0.3, color: c("#111111") },
  ];
}

const MAX = 4;

/** A copy of a body material wearing an outfit. `height` is the avatar's full height (m). */
export function outfitMaterial(base: THREE.MeshStandardMaterial, outfit: Outfit, skin: THREE.Color, height: number) {
  const m = base.clone();
  m.map = null;
  m.color.copy(skin);
  m.roughness = 0.75;
  const list = bands(outfit);
  const u = {
    uH: { value: height },
    uBand: { value: Array.from({ length: MAX }, (_, i) => (list[i] ? new THREE.Vector3(list[i].z0, list[i].z1, list[i].lat) : new THREE.Vector3(9, 9, 0))) },
    uBandColor: { value: Array.from({ length: MAX }, (_, i) => list[i]?.color ?? new THREE.Color()) },
    uBandPat: { value: Array.from({ length: MAX }, (_, i) => (list[i]?.pat ? new THREE.Vector4(list[i].pat!.r, list[i].pat!.g, list[i].pat!.b, list[i].scale ?? 8) : new THREE.Vector4(0, 0, 0, 0))) },
  };
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uH;\nvarying float vBZ;\nvarying float vBX;\nvarying vec2 vBP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBZ = position.z / uH;\nvBX = abs(position.x);\nvBP = vec2(position.x + position.y * 0.7, position.z);");
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying float vBZ;\nvarying float vBX;\nvarying vec2 vBP;\nuniform vec3 uBand[${MAX}];\nuniform vec3 uBandColor[${MAX}];\nuniform vec4 uBandPat[${MAX}];`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        for (int i = 0; i < ${MAX}; i++) {
          vec3 b = uBand[i];
          if (vBZ > b.x && vBZ < b.y && vBX < b.z) {
            vec3 col = uBandColor[i];
            vec4 pt = uBandPat[i];
            if (pt.w > 0.0) {
              // an Ankara-style print: rings on a diagonal grid, with diamonds between
              vec2 q = vBP * pt.w;
              q = vec2(q.x + q.y, q.y - q.x) * 0.7071;
              vec2 f = fract(q) - 0.5;
              float d = length(f);
              float dia = abs(f.x) + abs(f.y);
              if (d < 0.16 || (d > 0.24 && d < 0.31) || dia > 0.66) col = pt.rgb;
            }
            // a little fabric shading down the garment
            diffuseColor.rgb = col * (0.92 + 0.08 * sin(vBZ * 60.0));
          }
        }`,
      );
  };
  m.customProgramCacheKey = () => "outfit";
  return m;
}

// ---------------------------------------------------------------------------------------------

const skinCache = new Map<string, THREE.Color>();
let quad: { scene: THREE.Scene; cam: THREE.OrthographicCamera; mat: THREE.ShaderMaterial; rt: THREE.WebGLRenderTarget } | null = null;

/** The average colour of a face texture (its skin), read back from the GPU once per avatar. */
export function skinFrom(gl: THREE.WebGLRenderer, key: string, map: THREE.Texture | null): THREE.Color {
  const hit = skinCache.get(key);
  if (hit) return hit;
  const fallback = new THREE.Color("#8a5a40");
  if (!map) return fallback;
  if (!quad) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: null } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      // the middle of the face texture: skin, away from the hairline and the edges
      fragmentShader: "uniform sampler2D map; varying vec2 vUv; void main(){ gl_FragColor = texture2D(map, mix(vec2(0.3, 0.3), vec2(0.7, 0.7), vUv)); }",
    });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    quad = { scene, mat, cam: new THREE.OrthographicCamera(), rt: new THREE.WebGLRenderTarget(16, 16) };
  }
  quad.mat.uniforms.map.value = map;
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(quad.rt);
  gl.render(quad.scene, quad.cam);
  const px = new Uint8Array(16 * 16 * 4);
  gl.readRenderTargetPixels(quad.rt, 0, 0, 16, 16, px);
  gl.setRenderTarget(prev);
  // average the pixels that look like skin (drop the darkest and brightest: brows, eyes, teeth)
  const lum: [number, number, number, number][] = [];
  for (let i = 0; i < px.length; i += 4) lum.push([px[i] + px[i + 1] + px[i + 2], px[i], px[i + 1], px[i + 2]]);
  lum.sort((a, b) => a[0] - b[0]);
  const mid = lum.slice(Math.floor(lum.length * 0.25), Math.floor(lum.length * 0.75));
  if (!mid.length || mid[mid.length - 1][0] === 0) return fallback;
  const avg = mid.reduce((a, p) => [a[0] + p[1], a[1] + p[2], a[2] + p[3]], [0, 0, 0]).map((v) => v / mid.length / 255);
  // the render target holds linear values (the texture was decoded on sampling)
  const c = new THREE.Color().setRGB(avg[0], avg[1], avg[2], THREE.LinearSRGBColorSpace);
  skinCache.set(key, c);
  return c;
}
