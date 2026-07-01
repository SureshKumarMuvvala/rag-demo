import Logo from './Logo';
import Icon from './Icon';

const STAGES = ['Explore', 'Estimate', 'Propose'];
// Stagger the three stage reveals across the shared 4.2s loop (T/3 ≈ 1.4s each).
const STAGE_DELAY = ['0s', '1.4s', '2.8s'];

/**
 * Compact centered hero on the light background.
 *   Line 1 — a prominent brand cluster (~2 text lines tall): logo mark +
 *            shimmering "RAG | TCO" wordmark, with the animated, non-clickable
 *            Explore → Estimate → Propose stages trailing to the right of TCO.
 *   Line 2 — a one-line description (nowrap on desktop) with two emphasized
 *            (bold + larger + shimmer) terms.
 * All motion is CSS-only and disabled under prefers-reduced-motion.
 */
export default function Hero() {
  return (
    <section className="flex flex-col items-center pt-1 text-center">
      {/* LINE 1 — brand cluster + trailing stages, centered as a group */}
      <div className="flex flex-wrap items-end justify-center gap-x-4 gap-y-1.5">
        <Logo variant="horizontal" theme="light" markSize={46} />

        <div
          className="flex items-center gap-x-1.5 pb-1 font-mono text-sm"
          aria-label="Explore, then Estimate, then Propose"
        >
          {STAGES.map((stage, i) => (
            <span key={stage} className="flex items-center gap-x-1.5">
              <span className="stage-emph" style={{ animationDelay: STAGE_DELAY[i] }}>
                {stage}
              </span>
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="stage-arrow text-petrol"
                  style={{ animationDelay: STAGE_DELAY[i] }}
                >
                  <Icon name="arrow-right" className="h-3.5 w-3.5" />
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* LINE 2 — one sentence; forced to a single line on desktop */}
      <p className="mt-3 whitespace-normal font-body text-sm text-ink/70 hdr:whitespace-nowrap">
        An interactive{' '}
        <span className="rag-shimmer text-[1.5em] font-bold">estimator</span> for building a production{' '}
        <span className="rag-shimmer rag-shimmer--offset text-[1.5em] font-bold">RAG</span>{' '}
        system.
      </p>
    </section>
  );
}
