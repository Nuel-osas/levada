import { SCENE_SVG } from "./scene-svg";
import { SceneHud } from "./SceneHud";

/* Night lights, drawn on the scene's own pixel grid (art px, 300 x 125) and shown in dark mode only.
   Light is pixel art too: lit windows plus a 50% dither halo, never a blur. */
type Rect = [x: number, y: number, w: number, h: number];
const TOWER_WINDOWS: Rect[] = [
  [199, 35, 1, 4], [197, 36, 2, 4], [196, 37, 1, 4],
  [199, 43, 1, 4], [197, 44, 2, 4], [196, 45, 1, 4],
];
const LIGHTHOUSE_WINDOW: Rect[] = [[229, 53, 1, 4], [227, 54, 2, 4]];
const HOUSE_WINDOWS: Rect[] = [[206, 46, 1, 3], [207, 47, 2, 2], [208, 49, 1, 1], [231, 51, 1, 3], [230, 52, 1, 2], [219, 53, 2, 2], [220, 55, 1, 1]];
const VAULT_DOOR: Rect[] = [[120, 73, 5, 2], [125, 74, 1, 7], [124, 75, 1, 8], [116, 77, 1, 10], [115, 79, 1, 7], [117, 76, 1, 2], [118, 75, 1, 2], [119, 74, 1, 2]];

const cells = (rects: Rect[]) => {
  const s = new Set<string>();
  for (const [x, y, w, h] of rects) for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) s.add(`${x + i},${y + j}`);
  return s;
};
/** Pixels within `r` of a shape, on a checkerboard: the classic dithered glow. */
function halo(rects: Rect[], r: number, parity = 0) {
  const inside = cells(rects);
  const out = new Set<string>();
  for (const k of inside) {
    const [x, y] = k.split(",").map(Number);
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        const key = `${x + dx},${y + dy}`;
        if (!inside.has(key) && (x + dx + y + dy) % 2 === parity) out.add(key);
      }
  }
  return out;
}
const LAMP: Rect[] = [[233, 42, 1, 2], [234, 43, 2, 2], [236, 44, 2, 2], [242, 42, 1, 2], [240, 43, 2, 2], [238, 44, 2, 2]];
const toPath = (s: Set<string>) =>
  [...s].map((k) => { const [x, y] = k.split(","); return `M${x} ${y}h1v1h-1z`; }).join("");
const toRects = (rects: Rect[]) => rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join("");

const LIT = toRects([...TOWER_WINDOWS, ...LIGHTHOUSE_WINDOW]);
const GLOW_WARM = toPath(halo([...TOWER_WINDOWS, ...LIGHTHOUSE_WINDOW, ...HOUSE_WINDOWS], 1));
const GLOW_VAULT = toPath(halo(VAULT_DOOR, 1, 1));
const GLOW_LAMP = toPath(halo(LAMP, 1));

/**
 * The hero diorama: Mezo's ember island (left) joined to Base's tide island (right) by the
 * aqueduct. The brand SVG is inlined so scene-motion.css can animate its coins, sparkle, glints,
 * beacon, boat and ripples. The sea runs full-bleed behind it at the same whole-number scale.
 */
export function Scene() {
  return (
    <div className="stage">
      <div className="scene levada-scene" id="scene">
        <div className="scene__frame" dangerouslySetInnerHTML={{ __html: SCENE_SVG }} />
        <svg className="scene__lights" viewBox="0 0 300 125" shapeRendering="crispEdges" aria-hidden="true">
          <path className="lights__glow" fill="#FFD150" d={GLOW_WARM} />
          <path className="lights__glow" fill="#FFB627" d={GLOW_VAULT} />
          <path className="lights__lamp" fill="#FFE78A" d={GLOW_LAMP} />
          <path fill="#FFD150" d={LIT} />
        </svg>
        <span className="scene__mark scene__mark--bl" aria-hidden="true" />
        <span className="scene__mark scene__mark--br" aria-hidden="true" />
        <SceneHud />
      </div>
    </div>
  );
}
