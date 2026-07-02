// Reusable presentational pieces for RAG topic content, shared by the per-section
// "Learn" panels on the Estimate tab. These render from the shared CONTENT object
// (src/lib/exploreContent.ts) — they do not own any copy themselves.
//
// Previously these lived inside the standalone Explore tab; that tab was removed
// (its content now lives in the Learn panels), so the still-used renderers and
// the "Sample documents" Token Lab were lifted here.

import { useEffect, useState } from 'react';
import type { Inputs } from '../../lib/types';
import type { Section, Topic } from '../../lib/exploreContent';
import { TOKEN_SAMPLES, densityBucketFor } from '../../lib/exploreContent';
import { DOC_SIZE_PAGES, RATES } from '../../lib/rates';
import { useMoney } from '../../lib/currency';
import Icon from '../Icon';

// ---------------------------------------------------------------------------
// Section card — scannable bullets + key–value facts
// ---------------------------------------------------------------------------

export function SectionCard({ section }: { section: Section }) {
  return (
    <div className="rounded-xl border border-borders bg-tinted-surface/50 p-4">
      <h3 className="font-display text-sm font-semibold text-ink">{section.h}</h3>

      {section.facts && section.facts.length > 0 && (
        <dl className="mt-2 flex flex-col gap-2">
          {section.facts.map((f) => (
            <div key={f.k} className="flex flex-col">
              <dt className="font-body text-[11px] uppercase tracking-wide text-ink/55">{f.k}</dt>
              <dd className="font-mono text-[13px] text-ink">{f.v}</dd>
            </div>
          ))}
        </dl>
      )}

      {section.bullets && section.bullets.length > 0 && (
        <ul className={section.facts && section.facts.length > 0 ? 'mt-2.5' : 'mt-2'}>
          {section.bullets.map((b) => (
            <li key={b} className="flex gap-2 py-0.5 font-body text-[13px] leading-relaxed text-ink/75">
              <span
                aria-hidden="true"
                className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-petrol/70"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Links + verify note
// ---------------------------------------------------------------------------

export function LinksRow({ topic }: { topic: Topic }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
        Check live price
      </span>
      {topic.links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-borders bg-surfaces px-2.5 py-1 font-body text-[12px] text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          {l.label}
          <Icon name="external-link" className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}

export function VerifyNote() {
  return (
    <p className="font-mono text-[11px] text-amber">
      Illustrative prices, dated June 2026 — verify, prices move. Follow each link for the
      official page.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Token Lab — the "Sample documents" window. Reads TOKEN_SAMPLES from CONTENT
// and writes the chosen tokens/page density back into the shared Inputs.
// ---------------------------------------------------------------------------

export function TokenLab({
  inputs,
  onWriteInputs,
}: {
  inputs: Inputs;
  onWriteInputs: (patch: Partial<Inputs>) => void;
}) {
  const [sampleId, setSampleId] = useState<string>(TOKEN_SAMPLES[0].id);
  const [applied, setApplied] = useState(false);
  const formatCurrency = useMoney();
  const sample = TOKEN_SAMPLES.find((s) => s.id === sampleId) ?? TOKEN_SAMPLES[0];

  useEffect(() => setApplied(false), [sampleId]);

  const pagesPerDoc =
    inputs.avgDocSizePages === 'custom'
      ? inputs.avgDocSizePagesCustom ?? DOC_SIZE_PAGES.standard
      : DOC_SIZE_PAGES[inputs.avgDocSizePages];
  const pages = inputs.documents * pagesPerDoc;
  const embedTokens = pages * sample.tokens * (1 + Number(inputs.chunkOverlap));
  const perM = RATES.embedModels[inputs.embedModel].perM;
  const embedCost = (embedTokens * perM) / 1_000_000;
  const embedLabel = RATES.embedModels[inputs.embedModel].label;

  function applyTokens() {
    onWriteInputs({ tokensPerPage: densityBucketFor(sample.tokens) });
    setApplied(true);
  }

  return (
    <div className="rounded-xl border border-borders bg-surfaces p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">Sample documents</h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-petrol">
          try a page type
        </span>
      </div>

      {/* Sample page cards */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOKEN_SAMPLES.map((s) => {
          const active = s.id === sampleId;
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSampleId(s.id)}
              className={[
                'rounded-lg border p-2.5 text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light',
                active
                  ? 'border-petrol bg-tinted-surface'
                  : 'border-borders hover:bg-tinted-surface/60',
              ].join(' ')}
            >
              <span className="block font-display text-[13px] font-medium text-ink">
                {s.label}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] text-ink/55">
                {s.range} tok
              </span>
            </button>
          );
        })}
      </div>

      {/* Readout */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Readout label="Tokens / page" value={`~${sample.tokens.toLocaleString('en-US')}`} />
        <Readout
          label={`Embed whole corpus · ${embedLabel}`}
          value={formatCurrency(embedCost)}
        />
        <div className="rounded-lg bg-tinted-surface/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-petrol">Why</p>
          <p className="mt-1 font-body text-[12px] leading-snug text-ink/75">{sample.why}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={applyTokens}
          className="inline-flex items-center gap-2 rounded-lg border border-petrol bg-surfaces px-3 py-1.5 font-display text-[13px] font-medium text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          Use ~{sample.tokens.toLocaleString('en-US')} tokens/page in my estimate
        </button>
        {applied && (
          <span className="font-mono text-[11px] text-value-green">
            Applied → {densityBucketFor(sample.tokens)} density
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-[10px] text-ink/45">
        Corpus: {inputs.documents.toLocaleString('en-US')} docs × {pagesPerDoc} pages ·{' '}
        {Math.round(Number(inputs.chunkOverlap) * 100)}% overlap
      </p>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-tinted-surface/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-petrol">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
