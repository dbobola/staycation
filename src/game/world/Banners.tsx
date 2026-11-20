"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { EVENT } from "../data/event";
import { BANNERS, groundY, type Banner } from "./layout";

// Roll-up banners (85 × 200 cm, on their silver cassette bases), in three designs drawn in code:
//  - "welcome": the check-in banner (welcome home, get your key card)
//  - "staycation": the main poster (pool, palms, sunset)
//  - "party": the Silver Dome party (night, purple lights, pool party · grill night · movie night)

const W = 600, H = 1400;
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Manrope, Arial, sans-serif";

function palm(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(14, -120, 4, -240);
  g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.42;
    g.beginPath();
    g.moveTo(4, -240);
    const ex = 4 + Math.cos(a) * 130, ey = -240 + Math.sin(a) * 70 + 40;
    g.quadraticCurveTo(4 + Math.cos(a) * 70, -240 + Math.sin(a) * 90, ex, ey);
    g.quadraticCurveTo(4 + Math.cos(a) * 60, -240 + Math.sin(a) * 50, 4, -236);
    g.fill();
  }
  g.restore();
}

function waves(g: CanvasRenderingContext2D, y: number, colors: string[]) {
  colors.forEach((c, k) => {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(0, y + k * 40);
    for (let x = 0; x <= W; x += 10) g.lineTo(x, y + k * 40 + Math.sin(x / 45 + k) * 14);
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
  });
}

function design(kind: Banner["design"]) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.textAlign = "center";
  if (kind === "staycation") {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0e5d6b");
    sky.addColorStop(0.45, "#e98a52");
    sky.addColorStop(0.62, "#f6c27a");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffe2a8";
    g.beginPath();
    g.arc(W / 2, 760, 130, 0, Math.PI * 2);
    g.fill();
    waves(g, 820, ["#2ec4d6", "#1aa3b8", "#0e7c86", "#0b5c66"]);
    palm(g, 70, 900, 1.2, "#10282d");
    palm(g, 540, 930, 1.0, "#10282d");
    g.fillStyle = "#fff6e8";
    g.font = `800 40px ${SANS}`;
    g.fillText(EVENT.short.toUpperCase(), W / 2, 130);
    g.font = `700 118px ${SERIF}`;
    g.fillText("Stay", W / 2, 270);
    g.fillText("cation", W / 2, 385);
    g.font = `700 34px ${SANS}`;
    g.fillStyle = "#ffe2a8";
    g.fillText(`${EVENT.venue.toUpperCase()} · ${EVENT.city.toUpperCase()}`, W / 2, 450);
    g.fillStyle = "#fff6e8";
    g.font = `800 30px ${SANS}`;
    ["POOL", "GRILL", "MOVIES", "GAMES", "OLD FRIENDS"].forEach((w, i) => g.fillText(w, W / 2, 1110 + i * 46));
  } else if (kind === "party") {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#160a2e");
    bg.addColorStop(1, "#3b1466");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // light beams and confetti
    for (let i = 0; i < 6; i++) {
      g.fillStyle = ["rgba(168,77,255,0.25)", "rgba(46,196,214,0.22)", "rgba(240,160,75,0.22)"][i % 3];
      g.beginPath();
      g.moveTo(W / 2 + (i - 2.5) * 40, 0);
      g.lineTo((i / 5) * W - 140, H * 0.6);
      g.lineTo((i / 5) * W + 40, H * 0.6);
      g.fill();
    }
    for (let i = 0; i < 160; i++) {
      g.fillStyle = ["#f0a04b", "#2ec4d6", "#e0457b", "#fff6e8", "#a44dff"][i % 5];
      const x = (i * 97) % W, y = (i * 233) % H;
      g.fillRect(x, y, 8, 14);
    }
    // the disco ball
    g.fillStyle = "#d9dde3";
    g.beginPath();
    g.arc(W / 2, 170, 80, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#8a90a0";
    g.lineWidth = 2;
    for (let k = -3; k <= 3; k++) {
      g.beginPath();
      g.moveTo(W / 2 - 80, 170 + k * 22);
      g.lineTo(W / 2 + 80, 170 + k * 22);
      g.stroke();
    }
    g.fillStyle = "#fff6e8";
    g.font = `800 36px ${SANS}`;
    g.fillText(`${EVENT.short.toUpperCase()} PRESENTS`, W / 2, 360);
    g.font = `700 104px ${SERIF}`;
    g.fillStyle = "#f0a04b";
    g.fillText("The Silver", W / 2, 500);
    g.fillText("Dome", W / 2, 610);
    g.fillStyle = "#fff6e8";
    g.font = `700 150px ${SERIF}`;
    g.fillText("Party", W / 2, 770);
    g.font = `800 34px ${SANS}`;
    g.fillStyle = "#2ec4d6";
    ["POOL PARTY", "GRILL NIGHT", "MOVIE NIGHT", "KARAOKE · GAMES"].forEach((w, i) => g.fillText(w, W / 2, 920 + i * 64));
    g.fillStyle = "#fff6e8";
    g.font = `600 28px ${SANS}`;
    g.fillText(`${EVENT.venue} · ${EVENT.city}`, W / 2, 1290);
  } else {
    g.fillStyle = "#fff6e8";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#0e5d6b";
    g.fillRect(0, 0, W, 560);
    waves(g, 470, ["#2ec4d6", "#fff6e8"]);
    palm(g, 500, 470, 0.9, "#0b4650");
    g.fillStyle = "#fff6e8";
    g.font = `800 38px ${SANS}`;
    g.fillText(EVENT.short.toUpperCase(), W / 2, 140);
    g.font = `700 112px ${SERIF}`;
    g.fillText("Welcome", W / 2, 290);
    g.fillText("home", W / 2, 400);
    g.fillStyle = "#c0643a";
    g.font = `800 56px ${SANS}`;
    g.fillText("CHECK IN", W / 2, 720);
    g.fillText("HERE", W / 2, 790);
    g.fillStyle = "#10282d";
    g.font = `600 34px ${SANS}`;
    ["Get your key card", "Find your room partner", "Pick your meals"].forEach((w, i) => g.fillText(w, W / 2, 900 + i * 56));
    g.font = "120px serif";
    g.fillText("🔑", W / 2, 1180);
    g.fillStyle = "#0e5d6b";
    g.font = `700 30px ${SANS}`;
    g.fillText(`${EVENT.name} · ${EVENT.venue}`, W / 2, 1320);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const silver = new THREE.MeshStandardMaterial({ color: "#c7ccd2", metalness: 0.85, roughness: 0.3 });

function RollUp({ b, tex }: { b: Banner; tex: THREE.Texture }) {
  return (
    <group position={[b.x, groundY(b.x, b.z), b.z]} rotation-y={b.ry}>
      {/* the cassette base and its feet */}
      <mesh position={[0, 0.06, 0]} material={silver} castShadow>
        <boxGeometry args={[0.9, 0.11, 0.18]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.015, s * 0.14]} rotation-x={Math.PI / 2} material={silver}>
          <boxGeometry args={[0.85, 0.03, 0.02]} />
        </mesh>
      ))}
      {/* the pole behind, and the top rail */}
      <mesh position={[0, 1.1, -0.04]} material={silver}>
        <cylinderGeometry args={[0.012, 0.012, 2.05, 6]} />
      </mesh>
      <mesh position={[0, 2.13, 0]} material={silver}>
        <boxGeometry args={[0.88, 0.03, 0.03]} />
      </mesh>
      {/* the print, both sides */}
      <mesh position={[0, 1.12, 0.004]}>
        <planeGeometry args={[0.85, 2.0]} />
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.12, -0.004]} rotation-y={Math.PI}>
        <planeGeometry args={[0.85, 2.0]} />
        <meshStandardMaterial color="#e9e6df" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Banners() {
  const tex = useMemo(() => ({ welcome: design("welcome"), staycation: design("staycation"), party: design("party") }), []);
  return (
    <group>
      {BANNERS.map((b, i) => (
        <RollUp key={i} b={b} tex={tex[b.design]} />
      ))}
    </group>
  );
}
