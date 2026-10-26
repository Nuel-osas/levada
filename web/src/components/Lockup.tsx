import { useId } from "react";

/**
 * The Levada mark (the aqueduct arch, ember to tide) on its tile, with the wordmark beside it.
 * The tile follows the theme: ink on light, white on dark. `size` is the tile in px.
 */
export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg className={`mark ${className ?? ""}`} viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="6.5" y1="0" x2="33.5" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#3D63FF" />
        </linearGradient>
      </defs>
      <rect className="mark__tile" width="40" height="40" rx="11" />
      <path
        d="M6.5 28.5V17.5a4.5 4.5 0 0 1 4.5-4.5h18a4.5 4.5 0 0 1 4.5 4.5v11h-7.7v-2.2a5.8 5.8 0 0 0-11.6 0v2.2z"
        fill={`url(#${id})`}
      />
      <path className="mark__channel" d="M11 17h18" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Lockup({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={`lockup ${className ?? ""}`} role="img" aria-label="Levada" style={{ ["--s" as string]: `${size}px` }}>
      <Mark size={size} />
      <span className="lockup__word" aria-hidden="true">
        levada
      </span>
    </span>
  );
}
