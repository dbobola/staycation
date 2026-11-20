import * as THREE from "three";
import { LITE, Q } from "../quality";

// Every surface's picture is drawn here in code (no image files to download): the stone flags
// around the pool, the courtyard's interlocking pavers, the pool tiles, the hotel's window bays,
// the graffiti mural, the marble bar top, the ivy on the pergola and the signs.

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = LITE && w > 512 ? w / 2 : w;
  c.height = LITE && h > 512 ? h / 2 : h;
  const g = c.getContext("2d")!;
  if (c.width !== w) g.scale(c.width / w, c.height / h);
  return { c, g };
}

function tex(key: string, make: () => HTMLCanvasElement, repeat: [number, number] = [1, 1], srgb = true) {
  const k = key + repeat.join("x");
  const hit = cache.get(k);
  if (hit) return hit;
  const t = new THREE.CanvasTexture(make());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = LITE ? 2 : 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(k, t);
  return t;
}

/** A seeded random, so the textures look the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noise(g: CanvasRenderingContext2D, w: number, h: number, amount: number, seed = 1, size = 2) {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / (size * size * 3); i++) {
    const v = r() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${r() * amount})`;
    g.fillRect(r() * w, r() * h, size, size);
  }
}

/** Irregular stone flags with dark grout: the pool deck (photo: tan and terracotta flagstones). */
export function flagstone(repeat: [number, number]) {
  return tex(
    "flag",
    () => {
      // (worked out pixel by pixel: smaller on phones, where it's never seen up close)
      const S = Q.tex < 1 ? 256 : 512;
      const { c, g } = canvas(S, S);
      const r = rng(7);
      const seeds: [number, number, string][] = [];
      const tones = ["#c9a27a", "#b98c63", "#d1ae86", "#a97b55", "#c69b70", "#bf9469"];
      for (let i = 0; i < 26; i++) seeds.push([r() * S, r() * S, tones[Math.floor(r() * tones.length)]]);
      const img = g.createImageData(S, S);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          let d1 = 1e9, d2 = 1e9, best = 0;
          for (let i = 0; i < seeds.length; i++) {
            // wrap so the tile repeats seamlessly
            let dx = Math.abs(x - seeds[i][0]);
            let dy = Math.abs(y - seeds[i][1]);
            dx = Math.min(dx, S - dx);
            dy = Math.min(dy, S - dy);
            const d = dx * dx + dy * dy;
            if (d < d1) {
              d2 = d1;
              d1 = d;
              best = i;
            } else if (d < d2) d2 = d;
          }
          const edge = Math.sqrt(d2) - Math.sqrt(d1);
          const col = new THREE.Color(seeds[best][2]);
          const k = (x * 7 + y * 13) % 5 === 0 ? 0.96 : 1;
          const grout = edge < 4.5;
          const o = (y * S + x) * 4;
          img.data[o] = grout ? 70 : col.r * 255 * k;
          img.data[o + 1] = grout ? 62 : col.g * 255 * k;
          img.data[o + 2] = grout ? 56 : col.b * 255 * k;
          img.data[o + 3] = 255;
        }
      g.putImageData(img, 0, 0);
      noise(g, S, S, 0.12, 3);
      return c;
    },
    repeat,
  );
}

/** Interlocking pavers (the courtyard: cream and tan, a little worn). */
export function pavers(repeat: [number, number], tone: "cream" | "red" = "cream") {
  return tex(
    "pav" + tone,
    () => {
      const S = 256;
      const { c, g } = canvas(S, S);
      const r = rng(tone === "cream" ? 11 : 12);
      const base = tone === "cream" ? ["#d8c7a4", "#cdb993", "#e0d0ae", "#c8b089"] : ["#a9614a", "#9a5540", "#b56c52", "#8f4e3c"];
      g.fillStyle = tone === "cream" ? "#8f826a" : "#5d3a30";
      g.fillRect(0, 0, S, S);
      // "I" shaped pavers in a running bond: drawn as rounded bricks with a waist
      const bw = 32, bh = 16;
      for (let row = 0; row < S / bh; row++)
        for (let col = -1; col < S / bw + 1; col++) {
          const x = col * bw + (row % 2) * (bw / 2);
          const y = row * bh;
          g.fillStyle = base[Math.floor(r() * base.length)];
          g.beginPath();
          g.roundRect(x + 1.2, y + 1.2, bw - 2.4, bh - 2.4, 3);
          g.fill();
          g.fillStyle = "rgba(0,0,0,0.18)";
          g.fillRect(x + bw / 2 - 1, y + 1, 2, 3);
          g.fillRect(x + bw / 2 - 1, y + bh - 4, 2, 3);
        }
      noise(g, S, S, 0.14, 5);
      return c;
    },
    repeat,
  );
}

/** Pool tiles: small pale-blue mosaic squares. */
export function poolTiles(repeat: [number, number]) {
  return tex(
    "tiles",
    () => {
      const S = 256;
      const { c, g } = canvas(S, S);
      const r = rng(21);
      g.fillStyle = "#cfe9ee";
      g.fillRect(0, 0, S, S);
      const n = 16, t = S / n;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const l = 62 + r() * 14;
          g.fillStyle = `hsl(${188 + r() * 10}, ${55 + r() * 20}%, ${l}%)`;
          g.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
        }
      return c;
    },
    repeat,
  );
}

/** Artificial turf / grass. */
export function grass(repeat: [number, number], kind: "turf" | "field" | "wild" = "turf") {
  return tex(
    "grass" + kind,
    () => {
      const S = 256;
      const { c, g } = canvas(S, S);
      const r = rng(kind === "turf" ? 31 : kind === "field" ? 32 : 33);
      g.fillStyle = kind === "turf" ? "#4f8a3a" : kind === "field" ? "#6b9a45" : "#5e8a3c";
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 5000; i++) {
        const h = kind === "turf" ? 95 + r() * 20 : 80 + r() * 40;
        g.strokeStyle = `hsla(${h}, ${40 + r() * 25}%, ${kind === "turf" ? 32 + r() * 18 : 30 + r() * 25}%, 0.7)`;
        const x = r() * S, y = r() * S;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4);
        g.stroke();
      }
      if (kind !== "turf")
        for (let i = 0; i < 14; i++) {
          g.fillStyle = `rgba(${150 + r() * 40},${120 + r() * 30},${70 + r() * 20},${0.12 + r() * 0.15})`;
          g.beginPath();
          g.ellipse(r() * S, r() * S, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
      return c;
    },
    repeat,
  );
}

/** Painted render with a little grime: walls. */
export function render(color: string, repeat: [number, number], seed = 41) {
  return tex(
    "render" + color + seed,
    () => {
      const S = 256;
      const { c, g } = canvas(S, S);
      g.fillStyle = color;
      g.fillRect(0, 0, S, S);
      noise(g, S, S, 0.08, seed, 2);
      const r = rng(seed);
      // rain streaks from the top
      for (let i = 0; i < 18; i++) {
        const x = r() * S;
        const grd = g.createLinearGradient(0, 0, 0, S * (0.3 + r() * 0.6));
        grd.addColorStop(0, "rgba(40,40,40,0.10)");
        grd.addColorStop(1, "rgba(40,40,40,0)");
        g.fillStyle = grd;
        g.fillRect(x, 0, 2 + r() * 6, S);
      }
      return c;
    },
    repeat,
  );
}

/** Grey cement blocks (the field's boundary wall). */
export function blockWall(repeat: [number, number]) {
  return tex(
    "blocks",
    () => {
      const S = 256;
      const { c, g } = canvas(S, S);
      const r = rng(51);
      g.fillStyle = "#7d776c";
      g.fillRect(0, 0, S, S);
      const bw = 64, bh = 32;
      for (let row = 0; row < S / bh; row++)
        for (let col = -1; col < S / bw + 1; col++) {
          const x = col * bw + (row % 2) * (bw / 2);
          const l = 52 + r() * 10;
          g.fillStyle = `hsl(40, 6%, ${l}%)`;
          g.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        }
      noise(g, S, S, 0.2, 52, 2);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `rgba(60,80,40,${0.15 + r() * 0.2})`;
        g.beginPath();
        g.ellipse(r() * S, S - r() * 30, 20 + r() * 40, 10 + r() * 20, 0, 0, Math.PI * 2);
        g.fill();
      }
      return c;
    },
    repeat,
  );
}

/**
 * One bay of the hotel's facade (4 m wide, one storey): cream render, a window with a white frame
 * and dark glass, the split AC under it. Repeated across each wall.
 */
export function hotelBay(repeat: [number, number], lit: boolean) {
  return tex(
    "bay" + (lit ? "lit" : ""),
    () => {
      const W = 256, H = 205;
      const { c, g } = canvas(W, H);
      g.fillStyle = "#d9c6a0";
      g.fillRect(0, 0, W, H);
      noise(g, W, H, 0.06, 61);
      // floor band
      g.fillStyle = "#c8b28a";
      g.fillRect(0, H - 10, W, 10);
      // window
      const wx = 70, wy = 46, ww = 116, wh = 92;
      g.fillStyle = "#f3efe6";
      g.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
      const r = rng(Math.floor(Math.random() * 1e6));
      const glass = g.createLinearGradient(0, wy, 0, wy + wh);
      if (lit && r() < 0.8) {
        glass.addColorStop(0, "#ffe3a6");
        glass.addColorStop(1, "#f2b860");
      } else {
        glass.addColorStop(0, "#5f707a");
        glass.addColorStop(1, "#2d363d");
      }
      g.fillStyle = glass;
      g.fillRect(wx, wy, ww, wh);
      g.fillStyle = "#f3efe6";
      g.fillRect(wx + ww / 2 - 3, wy, 6, wh);
      g.fillRect(wx, wy + 30, ww, 5);
      // curtain hint
      g.fillStyle = "rgba(220,200,170,0.5)";
      g.fillRect(wx + 4, wy + 36, 20, wh - 40);
      // sill
      g.fillStyle = "#b9a684";
      g.fillRect(wx - 10, wy + wh + 6, ww + 20, 6);
      return c;
    },
    repeat,
  );
}

/** Terracotta roof sheeting (the hip roofs): ribbed, a little faded. */
export function roofSheet(repeat: [number, number], color = "#b65a32") {
  return tex(
    "roof" + color,
    () => {
      const S = 256;
      const { c, g } = canvas(S, S);
      g.fillStyle = color;
      g.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 16) {
        const grd = g.createLinearGradient(x, 0, x + 16, 0);
        grd.addColorStop(0, "rgba(255,255,255,0.10)");
        grd.addColorStop(0.5, "rgba(0,0,0,0.12)");
        grd.addColorStop(1, "rgba(255,255,255,0.10)");
        g.fillStyle = grd;
        g.fillRect(x, 0, 16, S);
      }
      for (let y = 0; y < S; y += 64) {
        g.fillStyle = "rgba(0,0,0,0.12)";
        g.fillRect(0, y, S, 2);
      }
      noise(g, S, S, 0.1, 71);
      return c;
    },
    repeat,
  );
}

/** Rusty corrugated iron (the neighbours' roofs). */
export function rustRoof(repeat: [number, number], seed = 81) {
  return tex(
    "rust" + seed,
    () => {
      const S = 128;
      const { c, g } = canvas(S, S);
      const r = rng(seed);
      g.fillStyle = r() < 0.5 ? "#8a4a2c" : "#7a5844";
      g.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 8) {
        g.fillStyle = "rgba(0,0,0,0.15)";
        g.fillRect(x, 0, 3, S);
      }
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${120 + r() * 80},${60 + r() * 40},${30},${0.2 + r() * 0.3})`;
        g.beginPath();
        g.ellipse(r() * S, r() * S, 4 + r() * 18, 3 + r() * 10, 0, 0, Math.PI * 2);
        g.fill();
      }
      return c;
    },
    repeat,
  );
}

/** Grey marble with dark veins: the bar top. */
export function marble(repeat: [number, number]) {
  return tex(
    "marble",
    () => {
      const S = 512;
      const { c, g } = canvas(S, S);
      const r = rng(91);
      g.fillStyle = "#c9c6c0";
      g.fillRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`;
        g.beginPath();
        g.ellipse(r() * S, r() * S, 30 + r() * 120, 10 + r() * 40, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 9; i++) {
        g.strokeStyle = `rgba(60,62,66,${0.25 + r() * 0.45})`;
        g.lineWidth = 0.6 + r() * 2.4;
        g.beginPath();
        let x = r() * S, y = 0;
        g.moveTo(x, y);
        while (y < S) {
          x += (r() - 0.5) * 50;
          y += 10 + r() * 30;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      return c;
    },
    repeat,
  );
}

/** Hanging ivy and autumn leaves on transparent ground (the pergola ceiling). */
export function ivy(repeat: [number, number]) {
  return tex(
    "ivy",
    () => {
      const S = 512;
      const { c, g } = canvas(S, S);
      const r = rng(101);
      for (let i = 0; i < 520; i++) {
        const x = r() * S, y = r() * S, s = 7 + r() * 11;
        const autumn = r() < 0.12;
        g.fillStyle = autumn ? `hsl(${18 + r() * 25}, 80%, ${45 + r() * 12}%)` : `hsl(${95 + r() * 25}, ${45 + r() * 25}%, ${26 + r() * 20}%)`;
        g.save();
        g.translate(x, y);
        g.rotate(r() * Math.PI * 2);
        g.beginPath();
        g.moveTo(0, -s);
        g.bezierCurveTo(s, -s * 0.6, s * 0.8, s * 0.6, 0, s);
        g.bezierCurveTo(-s * 0.8, s * 0.6, -s, -s * 0.6, 0, -s);
        g.fill();
        g.restore();
      }
      return c;
    },
    repeat,
  );
}

/**
 * The graffiti mural by the stairs: a woman's face in bold street-art colour blocks (purple, teal,
 * orange, yellow), the way it reads in the photos.
 */
export function mural() {
  return tex("mural", () => {
    const W = 1024, H = 340;
    const { c, g } = canvas(W, H);
    const r = rng(111);
    g.fillStyle = "#2c2a3a";
    g.fillRect(0, 0, W, H);
    // background splashes
    const cols = ["#e23d6c", "#22b3a8", "#f6a623", "#5b3fd1", "#ef5f2f", "#9bd34a", "#2f8fe0", "#f2e14c"];
    for (let i = 0; i < 70; i++) {
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.globalAlpha = 0.55 + r() * 0.45;
      g.beginPath();
      const x = r() * W, y = r() * H;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) g.lineTo(x + (r() - 0.5) * 220, y + (r() - 0.5) * 160);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    // the face (left third, as in the photo)
    const fx = 230, fy = 175;
    g.fillStyle = "#c77a4a";
    g.beginPath();
    g.ellipse(fx, fy, 120, 150, 0, 0, Math.PI * 2);
    g.fill();
    // colour-block shading
    g.fillStyle = "#7d3fb8";
    g.beginPath();
    g.moveTo(fx - 120, fy - 40);
    g.quadraticCurveTo(fx - 70, fy + 20, fx - 90, fy + 120);
    g.lineTo(fx - 125, fy + 40);
    g.fill();
    g.fillStyle = "#18a7b5";
    g.beginPath();
    g.moveTo(fx + 40, fy - 150);
    g.quadraticCurveTo(fx + 140, fy - 60, fx + 110, fy + 60);
    g.lineTo(fx + 70, fy - 20);
    g.fill();
    g.fillStyle = "#f3b13a";
    g.beginPath();
    g.ellipse(fx + 20, fy + 70, 50, 26, 0.2, 0, Math.PI * 2);
    g.fill();
    // hair
    g.fillStyle = "#1d1426";
    g.beginPath();
    g.ellipse(fx - 10, fy - 120, 150, 70, -0.15, Math.PI, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 8; i++) {
      g.fillStyle = cols[i];
      g.fillRect(fx - 140 + i * 34, fy - 175 + (i % 2) * 8, 22, 26);
    }
    // eyes
    for (const s of [-1, 1]) {
      g.fillStyle = "#fff";
      g.beginPath();
      g.ellipse(fx + s * 48, fy - 20, 30, 15, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2b6dd8";
      g.beginPath();
      g.arc(fx + s * 48, fy - 20, 11, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(fx + s * 48, fy - 20, 5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#111";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(fx + s * 48, fy - 32, 34, Math.PI * 1.15, Math.PI * 1.85);
      g.stroke();
    }
    // nose and lips
    g.strokeStyle = "#7a3b20";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(fx, fy - 5);
    g.lineTo(fx - 10, fy + 35);
    g.lineTo(fx + 8, fy + 38);
    g.stroke();
    g.fillStyle = "#d1213f";
    g.beginPath();
    g.ellipse(fx, fy + 78, 36, 14, 0, 0, Math.PI * 2);
    g.fill();
    // tags and stripes along the rest of the wall
    g.font = "900 italic 92px Arial Black, Impact, sans-serif";
    g.lineWidth = 8;
    const tags = ["VIBES", "IBADAN", "SILVER"];
    tags.forEach((t, i) => {
      const x = 430 + i * 200, y = 120 + (i % 2) * 130;
      g.save();
      g.translate(x, y);
      g.rotate(-0.08 + i * 0.05);
      g.strokeStyle = "#111";
      g.strokeText(t, 0, 0);
      g.fillStyle = cols[(i * 3 + 1) % cols.length];
      g.fillText(t, 0, 0);
      g.restore();
    });
    return c;
  });
}

/** A sign drawn as a picture (title + subtitle on a coloured board). */
export function signTexture(lines: { text: string; font: string; color: string; y: number }[], w: number, h: number, bg: string | null, key: string) {
  return tex("sign" + key, () => {
    const { c, g } = canvas(w, h);
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const l of lines) {
      g.font = l.font;
      g.fillStyle = l.color;
      g.fillText(l.text, w / 2, l.y, w * 0.92);
    }
    return c;
  });
}

/** The pool water's surface ripples (a normal map drawn as tiling waves). */
export function waterNormals() {
  return tex(
    "waterN",
    () => {
      const S = 256;
      const { c, g } = canvas(S, S);
      const img = g.createImageData(S, S);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const u = (x / S) * Math.PI * 2, v = (y / S) * Math.PI * 2;
          const dx = Math.cos(u * 3 + Math.sin(v * 2)) * 0.5 + Math.cos(u * 7 + v * 2) * 0.25 + Math.sin(u * 2 - v * 5) * 0.2;
          const dy = Math.sin(v * 4 + Math.cos(u * 3)) * 0.5 + Math.cos(v * 6 - u * 3) * 0.25 + Math.sin(u * 5 + v * 3) * 0.2;
          const o = (y * S + x) * 4;
          img.data[o] = 128 + dx * 60;
          img.data[o + 1] = 128 + dy * 60;
          img.data[o + 2] = 255;
          img.data[o + 3] = 255;
        }
      g.putImageData(img, 0, 0);
      return c;
    },
    [1, 1],
    false,
  );
}
