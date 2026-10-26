import { useId } from "react";

/** The Levada mark: the aqueduct arch, ember (Mezo) to tide (Base), with the channel cut across the top. */
export function Mark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId();
  const cut = `${id}-cut`;
  return (
    <svg className={`mark ${className ?? ""}`} viewBox="6 12 28 17" width={size} height={(size * 17) / 28} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="6.5" y1="0" x2="33.5" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF5A1F" />
          <stop offset="1" stopColor="#3D63FF" />
        </linearGradient>
        <mask id={cut}>
          <rect x="0" y="0" width="40" height="40" fill="#fff" />
          <path d="M11 17h18" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
        </mask>
      </defs>
      <path
        d="M6.5 28.5V17.5a4.5 4.5 0 0 1 4.5-4.5h18a4.5 4.5 0 0 1 4.5 4.5v11h-7.7v-2.2a5.8 5.8 0 0 0-11.6 0v2.2z"
        fill={`url(#${id})`}
        mask={`url(#${cut})`}
      />
    </svg>
  );
}

/** Mark and wordmark. `size` is the mark's width in px. */
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
