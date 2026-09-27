interface Props {
  size?: number;
  className?: string;
}

/** Pocket-with-card mark. Uses currentColor for the pocket so it works in both themes. */
export function Logo({ size = 48, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Pockets"
    >
      <g transform="rotate(-7 256 240)">
        <rect x="166" y="120" width="180" height="230" rx="22" fill="var(--bg-elevated)" stroke="var(--border-strong)" strokeWidth="6" />
        <rect x="192" y="152" width="70" height="14" rx="7" fill="var(--accent)" />
        <rect x="192" y="184" width="118" height="12" rx="6" fill="var(--border-strong)" />
        <rect x="192" y="210" width="94" height="12" rx="6" fill="var(--border-strong)" />
      </g>
      <path d="M104 236 H408 V366 C408 416 372 448 322 448 H190 C140 448 104 416 104 366 Z" fill="var(--accent)" />
      <path
        d="M128 260 H384 V362 C384 400 358 424 320 424 H192 C154 424 128 400 128 362 Z"
        fill="none"
        stroke="var(--bg)"
        strokeOpacity="0.55"
        strokeWidth="5"
        strokeDasharray="12 12"
        strokeLinecap="round"
      />
    </svg>
  );
}
