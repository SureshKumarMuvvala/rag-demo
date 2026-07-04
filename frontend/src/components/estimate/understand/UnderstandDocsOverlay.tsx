import { useEffect, useRef, useState } from 'react';
import type { Inputs } from '../../../lib/types';
import Icon from '../../Icon';
import AnalyzeDocsTab from './AnalyzeDocsTab';
import SampleDocsTab from './SampleDocsTab';
import NgoSchemesTab from './NgoSchemesTab';

type Tab = 'analyze' | 'sample' | 'ngo';

interface Props {
  inputs: Inputs;
  /** Apply a patch to the shared Estimate state (caller also closes + confirms). */
  onSave: (patch: Partial<Inputs>) => void;
  onClose: () => void;
}

/**
 * Full-screen in-app overlay (not a window.open popup). Files chosen inside are
 * read in-browser for analysis only — never uploaded, stored, or sent anywhere,
 * and are discarded when this component unmounts.
 */
export default function UnderstandDocsOverlay({ inputs, onSave, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('analyze');
  const [suggestion, setSuggestion] = useState<Partial<Inputs> | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll, focus the close button, and restore focus on unmount.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Understand my documents"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      className="udoc-enter fixed inset-0 z-50 flex flex-col bg-page-bg"
    >
      {/* Header */}
      <header className="shrink-0 border-b border-borders bg-surfaces shadow-card">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tinted-surface text-petrol">
                <Icon name="file-text" className="h-4.5 w-4.5" />
              </span>
              <h2 className="font-display text-lg font-semibold text-ink">
                Understand my documents
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!suggestion}
                onClick={() => suggestion && onSave(suggestion)}
                className={[
                  'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-display text-[13px] font-medium shadow-sm transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light',
                  suggestion
                    ? 'bg-petrol text-white hover:bg-petrol-light'
                    : 'cursor-not-allowed bg-borders text-ink/40',
                ].join(' ')}
              >
                <Icon name="download" className="h-4 w-4" />
                Save to estimate
              </button>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center gap-1.5 rounded-xl border border-borders bg-surfaces px-3 py-2 font-display text-[13px] font-medium text-ink transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
              >
                <span aria-hidden="true" className="text-base leading-none">
                  ×
                </span>
                Close
              </button>
            </div>
          </div>

          {/* Privacy disclaimer */}
          <p className="rounded-lg bg-tinted-surface/60 px-3 py-2 font-mono text-[11px] leading-snug text-ink/70">
            Files are analyzed in your browser only — never uploaded or stored. Supported: .txt,
            .md, .pdf, .docx. Token counts are approximate.
          </p>

          {/* Tabs */}
          <div role="tablist" aria-label="Understand documents tabs" className="flex gap-1">
            <TabBtn active={tab === 'analyze'} onClick={() => setTab('analyze')}>
              Analyze my documents
            </TabBtn>
            <TabBtn active={tab === 'sample'} onClick={() => setTab('sample')}>
              Sample documents
            </TabBtn>
            <TabBtn active={tab === 'ngo'} onClick={() => setTab('ngo')}>
              NGO scheme documents
            </TabBtn>
          </div>
        </div>
      </header>

      {/* Body (scrolls internally). Both tabs stay mounted so analysis isn't
          lost when switching to peek at the sample documents. */}
      <div className="min-h-0 flex-1 overflow-y-auto rag-scroll">
        <div className="mx-auto w-full max-w-4xl px-5 py-6">
          <div className={tab === 'analyze' ? '' : 'hidden'}>
            <AnalyzeDocsTab inputs={inputs} onSuggestion={setSuggestion} onSave={onSave} />
          </div>
          <div className={tab === 'sample' ? '' : 'hidden'}>
            <SampleDocsTab onSave={onSave} />
          </div>
          <div className={tab === 'ngo' ? '' : 'hidden'}>
            <NgoSchemesTab />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'rounded-lg px-3.5 py-1.5 font-display text-sm font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light',
        active ? 'bg-petrol text-white shadow-sm' : 'text-ink hover:bg-tinted-surface',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
