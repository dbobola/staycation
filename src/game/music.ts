// The music, made live in the browser (no audio files to download):
//  - "dinner": slow underground jazz by the long table: Rhodes chords on a ii–V–I, walking bass,
//    brushes and a swung ride, a little vinyl crackle
//  - "bonfire": a warm highlife / afrobeat groove at the fire: kick, shakers, talking drum, a bass
//    riff and a picked guitar
// Each has its own volume, faded up as you walk towards it and down as you walk away (see Music in
// world/Zones). Browsers only allow sound after a tap or key press, so it starts on the first one.

type Bus = "dinner" | "bonfire";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buses: Partial<Record<Bus, GainNode>> = {};
const levels: Record<Bus, number> = { dinner: 0, bonfire: 0 };
let muted = false;
let noise: AudioBuffer | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextBeat = 0;
let beat = 0;

const LOOKAHEAD = 0.25;

function makeNoise(c: AudioContext) {
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Start the audio on the first tap / key (browsers won't play before one). */
export function unlockMusic() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    // a gentle compressor glues the parts together and stops peaks on phone speakers
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    for (const b of ["dinner", "bonfire"] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(master);
      buses[b] = g;
    }
    noise = makeNoise(ctx);
    nextBeat = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 60);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(m: boolean) {
  muted = m;
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.2);
}
export const isMuted = () => muted;

/** How loud each zone's music should be now (0–1): eased, so it fades in and out. */
export function setZoneLevels(dinner: number, bonfire: number) {
  levels.dinner = dinner;
  levels.bonfire = bonfire;
  if (!ctx) return;
  buses.dinner?.gain.setTargetAtTime(dinner * 0.9, ctx.currentTime, 1.2);
  buses.bonfire?.gain.setTargetAtTime(bonfire, ctx.currentTime, 1.2);
}

// ---------------------------------------------------------------------------------------------
// instruments

function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tone(bus: Bus, t: number, freq: number, dur: number, type: OscillatorType, peak: number, cutoff = 2400, attack = 0.01) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  const g = c.createGain();
  env(g, t, attack, peak, dur);
  o.connect(f).connect(g).connect(buses[bus]!);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

/** A Rhodes-like electric piano note: a sine with a soft bell partial. */
function rhodes(t: number, freq: number, dur: number, peak = 0.05) {
  tone("dinner", t, freq, dur, "sine", peak, 3000, 0.012);
  tone("dinner", t, freq * 2, dur * 0.4, "sine", peak * 0.25, 4000, 0.005);
}

function hit(bus: Bus, t: number, dur: number, peak: number, type: BiquadFilterType, freq: number, q = 1) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, 0.003, peak, dur);
  s.connect(f).connect(g).connect(buses[bus]!);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

function kick(bus: Bus, t: number, peak: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  const g = c.createGain();
  env(g, t, 0.004, peak, 0.28);
  o.connect(g).connect(buses[bus]!);
  o.start(t);
  o.stop(t + 0.35);
}

/** A talking drum: a pitched thump that bends. */
function talkingDrum(t: number, from: number, to: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + 0.22);
  const g = c.createGain();
  env(g, t, 0.005, 0.16, 0.3);
  o.connect(g).connect(buses.bonfire!);
  o.start(t);
  o.stop(t + 0.4);
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// ii–V–I–vi in F, a bar each: Gm7, C7, Fmaj7, Dm7 (voicings as MIDI notes) and walking bass lines
const JAZZ_CHORDS = [
  [55, 58, 62, 65],
  [55, 58, 60, 64],
  [57, 60, 64, 65],
  [57, 60, 62, 65],
];
const JAZZ_BASS = [
  [43, 46, 50, 48],
  [36, 40, 43, 46],
  [41, 45, 48, 45],
  [38, 41, 45, 44],
];
// the bonfire groove: a riff in A minor over two bars of 8ths
const AFRO_BASS = [45, 0, 45, 48, 0, 50, 0, 52, 45, 0, 45, 43, 0, 40, 0, 43];
const AFRO_GTR = [69, 72, 76, 72, 69, 72, 76, 79, 67, 71, 74, 71, 67, 71, 74, 76];

function schedule() {
  if (!ctx) return;
  const jazzOn = levels.dinner > 0.01, afroOn = levels.bonfire > 0.01;
  while (nextBeat < ctx.currentTime + LOOKAHEAD) {
    const t = nextBeat;
    // the jazz is a slow 4/4 at 84 bpm, swung; the groove is 8ths at 104 bpm: both are scheduled
    // on a shared grid of 8th notes at 84 bpm (the groove's own timing is worked out below)
    const eighth = 60 / 84 / 2;
    const b = beat % 32; // four bars of 8ths
    const bar = Math.floor(b / 8);
    const inBar = b % 8;
    const swing = inBar % 2 === 1 ? eighth * 0.33 : 0;
    if (jazzOn) {
      // ride cymbal: ding, ding-a ding (swung)
      if (inBar % 2 === 0 || inBar === 3 || inBar === 7) hit("dinner", t + swing, 0.25, 0.035, "highpass", 7000);
      // brushes on 2 and 4, a soft kick on 1
      if (inBar === 2 || inBar === 6) hit("dinner", t, 0.18, 0.05, "bandpass", 2500, 0.7);
      if (inBar === 0) kick("dinner", t, 0.2);
      // walking bass on the beats
      if (inBar % 2 === 0) tone("dinner", t, mtof(JAZZ_BASS[bar][inBar / 2]), 0.42, "triangle", 0.2, 700);
      // the chord, comped on 1 and the "and" of 2
      if (inBar === 0 || inBar === 3) for (const n of JAZZ_CHORDS[bar]) rhodes(t + swing + Math.random() * 0.015, mtof(n), inBar === 0 ? 1.6 : 0.6);
      // vinyl crackle
      if (Math.random() < 0.5) hit("dinner", t + Math.random() * eighth, 0.01, 0.02, "highpass", 3000);
    }
    if (afroOn) {
      // on the same clock: a 16-step pattern a little quicker than the jazz
      const s = beat % 16;
      if (s % 4 === 0 || s === 6 || s === 11) kick("bonfire", t, 0.55);
      hit("bonfire", t, 0.05, 0.05, "highpass", 6000);
      hit("bonfire", t + eighth / 2, 0.04, 0.03, "highpass", 8000);
      if (s === 4 || s === 12) hit("bonfire", t, 0.12, 0.12, "bandpass", 1800, 1.2);
      if (s === 3 || s === 7 || s === 14) talkingDrum(t, s === 7 ? 220 : 180, s === 7 ? 130 : 260);
      if (AFRO_BASS[s]) tone("bonfire", t, mtof(AFRO_BASS[s]), 0.22, "triangle", 0.28, 600);
      tone("bonfire", t, mtof(AFRO_GTR[s]), 0.16, "triangle", 0.06, 3500, 0.003);
    }
    nextBeat += eighth;
    beat++;
  }
}

/** Stop everything (when the page closes). */
export function stopMusic() {
  if (timer) clearInterval(timer);
  void ctx?.close();
  ctx = null;
}
