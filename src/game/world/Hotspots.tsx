"use client";

import { Html } from "@react-three/drei";
import { useGame } from "../store";
import { SPOTS } from "./layout";

// From the air, every spot has a button floating over it: tap one and the camera flies down to it
// with its panel open.

export function Hotspots() {
  const phase = useGame((s) => s.phase);
  const panel = useGame((s) => s.panel);
  const done = useGame((s) => s.done);
  const set = useGame((s) => s.set);
  if (phase !== "aerial" || panel) return null;
  return (
    <group>
      {SPOTS.filter((s) => s.id !== "pool" && s.aerial !== false).map((s) => {
        const big = s.id === "checkin" || s.id === "yearbook";
        return (
          <Html key={s.id} position={[s.x, s.y, s.z]} center zIndexRange={[20, 10]}>
            <button
              onClick={() => set({ panel: s.id, focus: s.id })}
              className={`hotspot whitespace-nowrap ${big ? "hotspot-big" : ""} ${done[s.id] ? "hotspot-done" : ""}`}
            >
              <span aria-hidden>{s.icon}</span> {s.button}
              {done[s.id] && <span className="ml-1 opacity-80">✓</span>}
            </button>
          </Html>
        );
      })}
    </group>
  );
}
