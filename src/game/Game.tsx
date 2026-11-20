"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import * as THREE from "three";
import { preloadPeople } from "./avatar/Avatar";
import { AVATARS, PLAYER_AVATARS } from "./data/avatars";
import { LITE, Q } from "./quality";
import { useGame } from "./store";
import { Loader, Overlay } from "./ui/Overlay";
import { Panels } from "./ui/Panels";
import { AwardsBoard, FilmBoard, GateSign, MovieScreen, Yearbook3D } from "./world/Boards";
import { Bonfire } from "./world/Bonfire";
import { ArrivalCar, Fireworks } from "./world/Arrival";
import { Attendants } from "./world/Attendants";
import { Banners } from "./world/Banners";
import { Dinner } from "./world/Dinner";
import { Guests } from "./world/Guests";
import { Nightlife } from "./world/Nightlife";
import { Music } from "./world/Zones";
import { Guide } from "./world/Guide";
import { Hotspots } from "./world/Hotspots";
import { CameraRig, Player } from "./world/Player";
import { Pool } from "./world/Pool";
import { Resort } from "./world/Resort";
import { Sky } from "./world/Sky";
import { Street } from "./world/Street";
import { Surroundings } from "./world/Surroundings";

// The WESCOSA Staycation at Silver Dome, Ibadan: fly in over the city, look round the resort from
// the air, then walk in through the gate and do the weekend: check in, the Yearbook, a room
// partner, meals, movie night, games, the awards, and the pool.

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // scripted playthroughs drive these
  void import("./input").then((m) => Object.assign(window, { __input: m.input, __action: m.fireAction }));
  void import("./world/Player").then((m) => Object.assign(window, { __player: m.player, __cam: m.cam, __walkTo: m.walkTo }));
  void import("./world/Arrival").then((m) => Object.assign(window, { __arrival: m.arrival }));
  void import("./world/nav").then((m) => Object.assign(window, { __findPath: m.findPath, __free: m.free }));
  Object.assign(window, { __game: useGame });
}

/** Development only: lets a test script step frames by hand (when the page is in the background). */
function DevAdvance() {
  const advance = useThree((s) => s.advance);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  if (process.env.NODE_ENV !== "production") Object.assign(window, { __advance: advance, __camera: camera, __scene: scene });
  return null;
}

function World() {
  return (
    <>
      <Sky />
      <Resort />
      <Pool />
      <Surroundings />
      <Street />
      <GateSign />
      <Yearbook3D />
      <AwardsBoard />
      <MovieScreen />
      <FilmBoard />
      <Bonfire />
      <Guests />
      <Attendants />
      <Banners />
      <Dinner />
      <Nightlife />
      <ArrivalCar />
      <Fireworks />
      <Guide />
      <Player />
      <Hotspots />
      <CameraRig />
      <Music />
    </>
  );
}

export default function Game() {
  const [lost, setLost] = useState(false);
  useEffect(() => {
    useGame.getState().refresh();
    // your own choices, as saved (they may have been made on another phone)
    void useGame.getState().restore();
    const id = setInterval(() => useGame.getState().refresh(), 20000);
    // ?evening opens at dusk
    if (new URLSearchParams(location.search).has("evening")) useGame.getState().set({ evening: true });
    return () => clearInterval(id);
  }, []);
  return (
    <div className="fixed inset-0">
      <Canvas
        shadows={!LITE}
        dpr={Q.dpr}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05, powerPreference: "high-performance" }}
        camera={{ position: [170, 110, 190], fov: 42, near: 0.2, far: 1200 }}
        onCreated={({ gl }) => {
          preloadPeople([PLAYER_AVATARS.f, PLAYER_AVATARS.m, ...AVATARS.slice(0, Q.models).map((a) => a.id)]);
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            setLost(true);
          });
        }}
      >
        <DevAdvance />
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>
      <Overlay />
      <Panels />
      <Loader />
      {lost && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[#0b2328]/95 p-6 text-center">
          <div className="title text-3xl text-[var(--cream)]">The graphics took a break</div>
          <p className="max-w-sm text-sm text-white/75">Your browser reset its 3D graphics. Reload to carry on.</p>
          <button className="btn px-7 py-3" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
