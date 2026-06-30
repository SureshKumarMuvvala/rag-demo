interface IcebergProps {
  /** Percentage of total cost that lives below the inference "waterline". */
  hiddenPercent: number;
}

/**
 * Inline SVG iceberg motif: a small white tip above a dashed amber
 * waterline, with a larger submerged body labeled "{hidden%}% hidden".
 */
export default function Iceberg({ hiddenPercent }: IcebergProps) {
  const label = `${hiddenPercent}% hidden`;
  return (
    <svg
      viewBox="0 0 200 130"
      width="200"
      height="130"
      role="img"
      aria-label={label}
      className="block"
    >
      {/* Dashed amber waterline */}
      <line
        x1="4"
        y1="40"
        x2="196"
        y2="40"
        stroke="#C2790C"
        strokeWidth="1.25"
        strokeDasharray="5 4"
      />

      {/* Submerged body — large downward triangle */}
      <path
        d="M 20 40 L 180 40 L 100 124 Z"
        fill="#F2F8F8"
        stroke="#0E6E6E"
        strokeOpacity="0.45"
        strokeWidth="1"
      />

      {/* "X% hidden" label inside the submerged body */}
      <text
        x="100"
        y="82"
        textAnchor="middle"
        fontFamily="'IBM Plex Mono', ui-monospace, monospace"
        fontSize="12"
        fontWeight={600}
        fill="#C2790C"
      >
        {label}
      </text>

      {/* Above-water tip — small white triangle with ink outline */}
      <path
        d="M 88 40 L 112 40 L 100 10 Z"
        fill="#FFFFFF"
        stroke="#15242B"
        strokeWidth="1"
      />
    </svg>
  );
}
