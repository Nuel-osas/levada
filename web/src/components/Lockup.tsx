import { LOCKUP } from "./lockup-svg";

/**
 * The horizontal lockup, inlined. The mark is identical on light and dark; the drawn wordmark
 * takes the text colour (ink on paper, stone-100 on ink), as in lockup.svg and lockup-on-dark.svg.
 * `scale` is a whole number: the lockup is 124 x 28 art pixels.
 */
export function Lockup({ scale = 1, className }: { scale?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={LOCKUP.viewBox}
      width={124 * scale}
      height={28 * scale}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Levada"
    >
      {LOCKUP.mark.map((p, i) => (
        <path key={i} fill={p.fill} d={p.d} />
      ))}
      <path fill="currentColor" d={LOCKUP.wordmark} />
    </svg>
  );
}
