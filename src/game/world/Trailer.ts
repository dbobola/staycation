import * as THREE from "three";
import { FILM_BOARD } from "./layout";

// Where the big screen's picture is on your screen (in CSS pixels), worked out each frame from
// its corners, so the trailer's video player can sit exactly over it. null when it's not in view.

export const trailerRect: { r: { left: number; top: number; width: number; height: number } | null } = { r: null };

const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => new THREE.Vector3(FILM_BOARD.x + 0.01, FILM_BOARD.y0 + FILM_BOARD.h / 2 + (sy * FILM_BOARD.h) / 2, FILM_BOARD.z - (sx * FILM_BOARD.w) / 2)));
const v = new THREE.Vector3();

export function updateTrailerRect(camera: THREE.Camera, width: number, height: number) {
  camera.updateMatrixWorld();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of corners) {
    v.copy(c).project(camera);
    if (v.z > 1 || v.z < -1) {
      trailerRect.r = null;
      return;
    }
    const px = ((v.x + 1) / 2) * width, py = ((1 - v.y) / 2) * height;
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    y0 = Math.min(y0, py);
    y1 = Math.max(y1, py);
  }
  trailerRect.r = { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
}
