"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { setZoneLevels, stopMusic, unlockMusic } from "../music";
import { useGame } from "../store";
import { BONFIRE, DINNER } from "./layout";
import { player } from "./Player";

// Music by where you are: the jazz swells as you walk towards the dinner table and fades as you
// leave; the bonfire has its own groove. Updated a few times a second.

/** 1 within `near` metres, fading to 0 at `far`. */
const closeness = (d: number, near: number, far: number) => Math.max(0, Math.min(1, (far - d) / (far - near)));

export function Music() {
  const acc = useRef(0);
  useEffect(() => {
    const go = () => unlockMusic();
    window.addEventListener("pointerdown", go);
    window.addEventListener("keydown", go);
    return () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
      stopMusic();
    };
  }, []);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.25) return;
    acc.current = 0;
    const phase = useGame.getState().phase;
    // a trailer's playing: let it have the sound
    if (useGame.getState().nowShowing) {
      setZoneLevels(0, 0);
      return;
    }
    if (phase !== "walk") {
      // a hint of the jazz while you arrive, nothing from the air
      setZoneLevels(phase === "setup" || phase === "celebrate" ? 0.18 : 0, 0);
      return;
    }
    const dx = Math.max(0, Math.abs(player.x - (DINNER.x0 + DINNER.x1) / 2) - (DINNER.x1 - DINNER.x0) / 2);
    const dDinner = Math.hypot(dx, player.z - DINNER.z);
    const dFire = Math.hypot(player.x - BONFIRE.x, player.z - BONFIRE.z);
    setZoneLevels(closeness(dDinner, 6, 30), closeness(dFire, 8, 30));
  });
  return null;
}
