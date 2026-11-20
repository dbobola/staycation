"use client";

import dynamic from "next/dynamic";

// The loading card from the first moment, while the 3D code downloads (the game's own loader
// carries on with the same card).
function Booting() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b2328]">
      <div className="eyebrow tracking-[0.5em]">WESCOSA</div>
      <div className="title mt-2 text-5xl text-[var(--cream)] sm:text-6xl">Staycation</div>
      <div className="mt-2 text-sm text-white/60">Silver Dome · Ibadan</div>
      <div className="mt-8 h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-[4%] bg-[var(--sun)]" />
      </div>
      <div className="mt-3 text-xs text-white/45">Filling the pool…</div>
    </div>
  );
}

const Game = dynamic(() => import("@/game/Game"), { ssr: false, loading: Booting });

export default function Home() {
  return <Game />;
}
