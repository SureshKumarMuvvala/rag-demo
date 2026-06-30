interface WaterlineProps {
  /** Optional amber mono caption rendered on top of the line. */
  caption?: string;
}

/**
 * Dashed amber horizontal "waterline" used in Tab 01 to separate
 * the visible inference cost from everything that gets hidden below.
 */
export default function Waterline({ caption }: WaterlineProps) {
  return (
    <div className="relative my-2" role="presentation">
      <div
        aria-hidden="true"
        className="h-0 w-full border-t border-dashed border-amber"
      />
      {caption && (
        <span
          className="absolute right-0 top-0 -translate-y-1/2 bg-surfaces px-2 font-mono text-[10px] uppercase tracking-wider text-amber"
        >
          {caption}
        </span>
      )}
    </div>
  );
}
