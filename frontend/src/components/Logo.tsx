// RAG · TCO brand logo.
//
// Thesis: the "waterline". Teams budget only the visible API cost (the bright
// top segment); most real cost sits BELOW a dashed amber waterline (storage,
// retrieval, re-indexing, egress, labor — the darker segments). The mark is a
// small stacked cost tower. The dashed amber waterline appears in EVERY variant.

type Variant = 'horizontal' | 'stacked' | 'mark';
type Theme = 'light' | 'dark';

interface LogoProps {
  variant?: Variant;
  theme?: Theme;
  /** Mark height in px (width scales with it). Defaults per variant. */
  markSize?: number;
  className?: string;
}

// Segment fills top→bottom. Segment 1 (above the waterline) is petrol-light;
// segments 2–4 step petrol → deep-petrol → ink (only the last goes dark).
// Dark theme inverts the lower run toward ice/white to stay visible on #15242B.
const SEGMENTS: Record<Theme, [string, string, string, string]> = {
  light: ['#2DA0A0', '#0E6E6E', '#0A5252', '#15242B'],
  dark: ['#2DA0A0', '#5FC2C2', '#A9DCDC', '#EAF6F6'],
};
const AMBER = '#C2790C';

/**
 * The stacked cost-tower mark as a self-contained inline SVG.
 * Four rounded segments (top slightly taller so the eye starts bright) with a
 * signature dashed amber waterline just under segment 1.
 */
function Mark({ size, theme }: { size: number; theme: Theme }) {
  const [s1, s2, s3, s4] = SEGMENTS[theme];
  const x = 4.5;
  const w = 15;
  const r = 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="RAG TCO"
    >
      {/* Segment 1 — visible / budgeted cost, slightly taller */}
      <rect x={x} y="2" width={w} height="5.2" rx={r} fill={s1} />
      {/* Dashed amber waterline — the signature (heavier than the gaps) */}
      <line
        x1="3.5"
        y1="8.6"
        x2="20.5"
        y2="8.6"
        stroke={AMBER}
        strokeWidth="1.8"
        strokeDasharray="2.6 1.8"
        strokeLinecap="round"
      />
      {/* Segments 2–4 — below the waterline */}
      <rect x={x} y="9.9" width={w} height="3.6" rx={r} fill={s2} />
      <rect x={x} y="14.7" width={w} height="3.6" rx={r} fill={s3} />
      <rect x={x} y="19.5" width={w} height="3.6" rx={r} fill={s4} />
    </svg>
  );
}

/** Wordmark: "RAG" grotesk + divider + "TCO" mono with amber underline.
 *  `fontPx` is derived from the mark height so the two read as one unit. */
function Wordmark({ theme, fontPx }: { theme: Theme; fontPx: number }) {
  const ink = theme === 'dark' ? '#FFFFFF' : '#15242B';
  const divider = theme === 'dark' ? 'rgba(255,255,255,0.35)' : '#D9E0E3';
  return (
    <span
      className="inline-flex items-center gap-2 leading-none"
      style={{ fontSize: `${fontPx}px` }}
    >
      <span className="rag-shimmer font-display font-bold tracking-tight">RAG</span>
      <span
        aria-hidden="true"
        className="inline-block"
        style={{ width: 1, height: '1.1em', backgroundColor: divider }}
      />
      <span className="relative font-mono font-medium" style={{ color: ink }}>
        TCO
        <span
          aria-hidden="true"
          className="absolute -bottom-1 left-0 block h-[2px] w-full rounded-full"
          style={{ backgroundColor: AMBER }}
        />
      </span>
    </span>
  );
}

export default function Logo({
  variant = 'horizontal',
  theme = 'light',
  markSize,
  className,
}: LogoProps) {
  if (variant === 'mark') {
    return (
      <span className={className} aria-label="RAG TCO">
        <Mark size={markSize ?? 24} theme={theme} />
      </span>
    );
  }

  if (variant === 'stacked') {
    const size = markSize ?? 56;
    return (
      <span
        className={['inline-flex flex-col items-center gap-2', className]
          .filter(Boolean)
          .join(' ')}
        aria-label="RAG TCO"
      >
        <Mark size={size} theme={theme} />
        <Wordmark theme={theme} fontPx={Math.round(size * 0.5)} />
      </span>
    );
  }

  // horizontal — wordmark height tracks the mark so they read as one unit.
  const size = markSize ?? 30;
  return (
    <span
      className={['inline-flex items-center gap-2.5', className].filter(Boolean).join(' ')}
      aria-label="RAG TCO"
    >
      <Mark size={size} theme={theme} />
      <Wordmark theme={theme} fontPx={Math.round(size * 0.8)} />
    </span>
  );
}
