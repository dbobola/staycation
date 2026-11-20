// Shared player input: the keyboard and the on-screen pad write here, the game loop reads it.

export const input = { up: false, down: false, left: false, right: false, run: false, action: false, turnL: false, turnR: false };

const KEYS: Record<string, keyof typeof input> = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
};

/** Listeners for "E" (or Enter / Space): sit, stand, open the spot you're at. */
const actionListeners = new Set<() => void>();
export const onAction = (f: () => void) => {
  actionListeners.add(f);
  return () => void actionListeners.delete(f);
};
export const fireAction = () => actionListeners.forEach((f) => f());

let bound = false;
export function bindKeyboard() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  const typing = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  };
  window.addEventListener("keydown", (e) => {
    if (typing(e)) return;
    if ((e.code === "KeyE" || e.code === "Enter" || e.code === "Space") && !e.repeat) {
      e.preventDefault();
      fireAction();
      return;
    }
    const k = KEYS[e.code];
    if (!k) return;
    input[k] = true;
    if (e.code.startsWith("Arrow")) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    const k = KEYS[e.code];
    if (k) input[k] = false;
  });
  window.addEventListener("blur", () => Object.assign(input, { up: false, down: false, left: false, right: false, run: false, turnL: false, turnR: false }));
}

/** x: right (+) / left (−), y: forward (+) / back (−). */
export function axes() {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  return { x, y };
}
