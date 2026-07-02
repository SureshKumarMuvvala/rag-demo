import Logo from './Logo';

/**
 * Compact centered hero on the light background.
 *   Line 1 — a prominent brand cluster: logo mark + shimmering "RAG | TCO" wordmark.
 *   Line 2 — a one-line description (nowrap on desktop) with two emphasized
 *            (bold + larger + shimmer) terms.
 * All motion is CSS-only and disabled under prefers-reduced-motion.
 */
export default function Hero() {
  return (
    <section className="flex flex-col items-center pt-1 text-center">
      {/* LINE 1 — brand cluster, centered */}
      <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-1.5">
        <Logo variant="horizontal" theme="light" markSize={46} />
      </div>

      {/* LINE 2 — one sentence; gently scrolls left↔right (ping-pong marquee).
          No overflow clipping, so the full line is visible throughout the travel. */}
      <p className="mt-3 max-w-full whitespace-nowrap font-body text-sm text-ink/70">
        <span className="hero-marquee">
          An interactive{' '}
          <span className="rag-shimmer text-[1.5em] font-bold">Planner</span> for your
          production <span className="rag-shimmer rag-shimmer--offset text-[1.5em] font-bold">RAG</span>{' '}
          system
        </span>
      </p>
    </section>
  );
}
