import { useEffect, useId, useState } from 'react';

interface Props {
  /** Controlled open state (owned by the section). */
  open: boolean;
  onToggle: () => void;
  label?: string;
  children: React.ReactNode;
}

/**
 * "Want to explore more options ▾" disclosure for a section's advanced levers.
 * A real <button aria-expanded>; the panel animates (grid-rows + opacity,
 * motion-reduce safe) and its content unmounts while collapsed so hidden inputs
 * never become keyboard tab targets.
 */
export default function AdvancedDisclosure({
  open,
  onToggle,
  label = 'Want to explore more options',
  children,
}: Props) {
  const id = useId();
  const [render, setRender] = useState(open);
  const [show, setShow] = useState(open);

  useEffect(() => {
    if (open) {
      setRender(true);
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }
    setShow(false);
    const t = window.setTimeout(() => setRender(false), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 font-mono text-[11px] uppercase tracking-wider text-petrol transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className={['transition-transform duration-300 motion-reduce:transition-none', open ? 'rotate-180' : ''].join(' ')}
        >
          ▾
        </span>
      </button>
      {render && (
        <div
          id={id}
          className={[
            'grid transition-all duration-300 ease-out motion-reduce:transition-none',
            show ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          ].join(' ')}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-5 pt-1">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
