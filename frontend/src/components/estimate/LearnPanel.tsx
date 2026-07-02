import { useEffect, useRef, useState } from 'react';
import type { Inputs } from '../../lib/types';
import type { Topic } from '../../lib/exploreContent';
import { LinksRow, SectionCard, TokenLab, VerifyNote } from '../explore/TopicContent';
import Icon from '../Icon';

interface LearnPanelProps {
  topic: Topic;
  open: boolean;
  /** Collapse the panel (called by ×, Esc). The caller also returns focus. */
  onClose: () => void;
  /** Live inputs + writer, so a topic's widget (Token Lab) can read/write state. */
  inputs?: Inputs;
  onWriteInputs?: (patch: Partial<Inputs>) => void;
}

/**
 * Inline, collapsible "Learn" panel for an Estimate section. Renders the SAME
 * Explore topic content (sections/facts/bullets + "Check live price" links) by
 * reusing the Explore renderers and pulling from the shared CONTENT object — no
 * text is duplicated here.
 *
 * Animation: a grid-rows 0fr→1fr + opacity transition (motion-reduce safe). The
 * inner content is unmounted while collapsed so it never becomes a hidden tab
 * target. Focus moves into the panel on open; the caller restores it on close.
 */
export default function LearnPanel({
  topic,
  open,
  onClose,
  inputs,
  onWriteInputs,
}: LearnPanelProps) {
  const [render, setRender] = useState(open);
  const [show, setShow] = useState(open);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }
    // Collapse, then unmount after the transition window. Timeout-based so it
    // also works when transitions are disabled (prefers-reduced-motion).
    setShow(false);
    const t = window.setTimeout(() => setRender(false), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  // Move focus into the panel once it has opened.
  useEffect(() => {
    if (show) {
      const raf = requestAnimationFrame(() => headerRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [show]);

  if (!render) return null;

  return (
    <div
      className={[
        'grid transition-all duration-300 ease-out motion-reduce:transition-none',
        show ? 'mb-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      ].join(' ')}
    >
      <div className="overflow-hidden">
        <div
          role="region"
          aria-label={`Learn: ${topic.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onClose();
            }
          }}
          className="rounded-xl border border-petrol/25 bg-tinted-surface/40 p-4"
        >
          {/* Panel header: topic title + close affordance */}
          <div
            ref={headerRef}
            tabIndex={-1}
            className="flex items-center justify-between gap-3 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-tinted-surface text-petrol">
                <Icon name={topic.icon} className="h-4 w-4" />
              </span>
              <h3 className="font-display text-sm font-semibold text-ink">{topic.title}</h3>
            </div>
            <button
              type="button"
              aria-label="Close Learn panel"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink/50 transition-colors hover:bg-tinted-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>

          <p className="mt-2 font-body text-[13px] text-ink/70">{topic.summary}</p>

          {topic.sections.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {topic.sections.map((s) => (
                <SectionCard key={s.h} section={s} />
              ))}
            </div>
          )}

          {/* Interactive "Sample documents" Token Lab (documents topic only) */}
          {topic.widget === 'tokenLab' && inputs && onWriteInputs && (
            <div className="mt-3">
              <TokenLab inputs={inputs} onWriteInputs={onWriteInputs} />
            </div>
          )}

          {topic.links.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <LinksRow topic={topic} />
              <VerifyNote />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
