// RAG · TCO logo: a stylised iceberg with an amber waterline.
// Matches the app's hidden-cost metaphor and design-system palette.
export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="RAG TCO logo"
      role="img"
    >
      {/* Rounded petrol background */}
      <rect width="40" height="40" rx="10" fill="#0E6E6E" />

      {/* Iceberg: visible top */}
      <path
        d="M20 7L30 21H25L22 17L20 21H17L20 14L23 21H10L20 7Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />

      {/* Iceberg: hidden bottom */}
      <path
        d="M10 21H17L20 27L23 21H30L20 35L10 21Z"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />

      {/* Amber dashed waterline */}
      <line
        x1="6"
        y1="21"
        x2="34"
        y2="21"
        stroke="#C2790C"
        strokeWidth="2"
        strokeDasharray="3 2"
        strokeLinecap="round"
      />
    </svg>
  );
}
