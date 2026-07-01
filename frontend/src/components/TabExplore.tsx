import { useEffect, useMemo, useRef, useState } from 'react';
import type { Inputs } from '../lib/types';
import { formatCurrency } from '../lib/costs';
import { DOC_SIZE_PAGES, RATES } from '../lib/rates';
import {
  CONTENT,
  GLOSSARY,
  OVERLAYS,
  PIPELINE,
  TOKEN_SAMPLES,
  densityBucketFor,
  rowToPatch,
} from '../lib/exploreContent';
import type { PresetField, Section, Topic, TopicTable } from '../lib/exploreContent';
import Icon from './Icon';

interface TabExploreProps {
  inputs: Inputs;
  /** Controlled selected topic id (lifted to App for cross-tab deep-links). */
  selectedId: string;
  onSelectTopic: (id: string) => void;
  /** Switch to the Estimate tab, apply an optional patch, and flash the field. */
  onApplyPreset: (patch: Partial<Inputs>, field: PresetField) => void;
  /** Patch shared inputs in place without leaving the Explore tab (tokenLab). */
  onWriteInputs: (patch: Partial<Inputs>) => void;
}

// ---------------------------------------------------------------------------
// Root: master–detail layout
// ---------------------------------------------------------------------------

export default function TabExplore({
  inputs,
  selectedId,
  onSelectTopic,
  onApplyPreset,
  onWriteInputs,
}: TabExploreProps) {
  const railRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const setSelectedId = onSelectTopic;
  const selectTopic = onSelectTopic;

  const topic = CONTENT.find((t) => t.id === selectedId) ?? CONTENT[0];

  function moveSelection(delta: number) {
    const idx = CONTENT.findIndex((t) => t.id === selectedId);
    const next = CONTENT[(idx + delta + CONTENT.length) % CONTENT.length];
    setSelectedId(next.id);
    // Move focus to the newly selected rail button.
    window.requestAnimationFrame(() => railRefs.current[next.id]?.focus());
  }

  function handleRailKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedId(CONTENT[0].id);
      window.requestAnimationFrame(() => railRefs.current[CONTENT[0].id]?.focus());
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = CONTENT[CONTENT.length - 1];
      setSelectedId(last.id);
      window.requestAnimationFrame(() => railRefs.current[last.id]?.focus());
    }
  }

  return (
    <div className="flex h-[calc(100vh-15.5rem)] min-h-[26rem] flex-col gap-3 nav:grid nav:grid-cols-[260px_minmax(0,1fr)] nav:gap-6">
      {/* Mobile chip bar */}
      <div className="flex shrink-0 gap-2 overflow-x-auto rag-scroll pb-1 nav:hidden">
        {CONTENT.map((t) => (
          <RailChip
            key={t.id}
            topic={t}
            active={t.id === selectedId}
            onClick={() => selectTopic(t.id)}
          />
        ))}
      </div>

      {/* Desktop vertical rail */}
      <nav
        aria-label="Explore topics"
        className="hidden h-full flex-col gap-1 nav:flex"
      >
        {CONTENT.map((t) => {
          const active = t.id === selectedId;
          return (
            <button
              key={t.id}
              ref={(el) => {
                railRefs.current[t.id] = el;
              }}
              type="button"
              aria-current={active ? 'true' : undefined}
              tabIndex={active ? 0 : -1}
              onClick={() => selectTopic(t.id)}
              onKeyDown={handleRailKeyDown}
              className={[
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg',
                active
                  ? 'bg-petrol text-white shadow-sm'
                  : 'text-ink hover:bg-tinted-surface',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  active ? 'bg-white/15 text-white' : 'bg-tinted-surface text-petrol',
                ].join(' ')}
              >
                <Icon name={t.icon} className="h-4 w-4" />
              </span>
              <span className="font-display text-sm font-medium">{t.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Detail pane — the only region that scrolls */}
      <section
        tabIndex={0}
        aria-label={`${topic.title} details`}
        className="min-h-0 flex-1 overflow-y-auto rag-scroll rounded-2xl border border-borders bg-surfaces p-5 shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light md:p-6"
      >
        <div key={topic.id} className="explore-enter">
          <TopicDetail
            topic={topic}
            inputs={inputs}
            selectTopic={selectTopic}
            onApplyPreset={onApplyPreset}
            onWriteInputs={onWriteInputs}
          />
        </div>
      </section>
    </div>
  );
}

function RailChip({
  topic,
  active,
  onClick,
}: {
  topic: Topic;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'true' : undefined}
      onClick={onClick}
      className={[
        'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light',
        active
          ? 'border-petrol bg-petrol text-white'
          : 'border-borders bg-surfaces text-ink hover:bg-tinted-surface',
      ].join(' ')}
    >
      <Icon name={topic.icon} className="h-4 w-4" />
      <span className="whitespace-nowrap font-display font-medium">{topic.title}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Topic detail — shared template
// ---------------------------------------------------------------------------

function TopicDetail({
  topic,
  inputs,
  selectTopic,
  onApplyPreset,
  onWriteInputs,
}: {
  topic: Topic;
  inputs: Inputs;
  selectTopic: (id: string) => void;
  onApplyPreset: (patch: Partial<Inputs>, field: PresetField) => void;
  onWriteInputs: (patch: Partial<Inputs>) => void;
}) {
  // Per-topic selectable-row state (reset when the topic changes via `key`).
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<string>(TOKEN_SAMPLES[0].id);

  useEffect(() => {
    setSelectedRow(null);
  }, [topic.id]);

  const isGlossary = topic.widget === 'glossaryFilter';

  return (
    <div className="flex flex-col gap-6">
      {/* Title + summary */}
      <header>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tinted-surface text-petrol">
            <Icon name={topic.icon} className="h-5 w-5" />
          </span>
          <h2 className="font-display text-xl font-semibold text-ink">{topic.title}</h2>
        </div>
        <p className="mt-2 font-body text-sm text-ink/70">{topic.summary}</p>
      </header>

      {/* Overview-only: interactive pipeline diagram */}
      {topic.id === 'overview' && <PipelineDiagram selectTopic={selectTopic} />}

      {/* Glossary is a special full-widget topic */}
      {isGlossary ? (
        <GlossaryView selectTopic={selectTopic} />
      ) : (
        <>
          {/* Explainer sections — scannable bullets + key–value facts */}
          {topic.sections.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {topic.sections.map((s) => (
                <SectionCard key={s.h} section={s} />
              ))}
            </div>
          )}

          {/* Optional widget: tokenLab */}
          {topic.widget === 'tokenLab' && (
            <TokenLab
              inputs={inputs}
              sampleId={sampleId}
              setSampleId={setSampleId}
              onWriteInputs={onWriteInputs}
            />
          )}

          {/* Comparison table */}
          {topic.table && (
            <ComparisonTable
              topicId={topic.id}
              table={topic.table}
              selectedRow={selectedRow}
              setSelectedRow={setSelectedRow}
            />
          )}

          {/* Check live price links + verify note */}
          {topic.links.length > 0 && <LinksRow topic={topic} />}
          <VerifyNote />

          {/* Use in Estimate */}
          {topic.preset && (
            <UseInEstimateButton
              topic={topic}
              selectedRow={selectedRow}
              sampleTokens={
                topic.widget === 'tokenLab'
                  ? TOKEN_SAMPLES.find((s) => s.id === sampleId)?.tokens ?? null
                  : null
              }
              onApplyPreset={onApplyPreset}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline diagram
// ---------------------------------------------------------------------------

function PipelineDiagram({ selectTopic }: { selectTopic: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-borders bg-tinted-surface/40 p-4">
      <div className="flex flex-col items-stretch gap-2 nav:flex-row nav:items-center nav:gap-1">
        {PIPELINE.map((node, i) => (
          <div
            key={node.id}
            className="flex flex-col items-center nav:flex-1 nav:flex-row"
          >
            <PipelineStage node={node} onActivate={() => selectTopic(node.id)} />
            {i < PIPELINE.length - 1 && <FlowArrow />}
          </div>
        ))}
        <FlowArrow />
        {/* Terminal answer chip (not clickable) */}
        <div className="flex shrink-0 items-center justify-center rounded-lg border border-value-green/40 bg-value-green/10 px-3 py-2">
          <span className="font-display text-sm font-medium text-value-green">Answer</span>
        </div>
      </div>

      {/* Cross-cutting overlays */}
      <div className="mt-4 flex flex-wrap gap-2">
        {OVERLAYS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => selectTopic(o.id)}
            className="group flex items-center gap-2 rounded-full border border-borders bg-surfaces px-3 py-1.5 text-left transition-colors hover:border-petrol hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
          >
            <span className="font-display text-xs font-medium text-ink">{o.label}</span>
            <span className="font-mono text-[10px] text-ink/55">{o.note}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink/50">
        Click any stage to dive in.
      </p>
    </div>
  );
}

function PipelineStage({
  node,
  onActivate,
}: {
  node: (typeof PIPELINE)[number];
  onActivate: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate();
        }
      }}
      className={[
        'group relative flex w-full items-center gap-2 rounded-xl bg-surfaces px-3 py-2 transition-all',
        'cursor-pointer hover:-translate-y-0.5 hover:shadow-card',
        'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light',
        'hover:border-petrol',
        node.optional
          ? 'border border-dashed border-ink/40'
          : 'border border-borders',
      ].join(' ')}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-petrol text-white">
        <Icon name={node.icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-[13px] font-medium text-ink">
          {node.label}
        </span>
        <span className="block truncate font-mono text-[10px] text-ink/55">{node.lever}</span>
      </span>
      {node.optional && (
        <span className="absolute -top-2 right-2 rounded-full bg-amber px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">
          optional
        </span>
      )}
    </div>
  );
}

function FlowArrow() {
  return (
    <>
      {/* Horizontal on desktop */}
      <span className="hidden shrink-0 px-1 text-ink/35 nav:block">
        <Icon name="arrow-right" className="h-4 w-4" />
      </span>
      {/* Vertical on mobile */}
      <span className="py-0.5 text-ink/35 nav:hidden">
        <Icon name="arrow-down" className="h-4 w-4" />
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// tokenLab widget
// ---------------------------------------------------------------------------

function TokenLab({
  inputs,
  sampleId,
  setSampleId,
  onWriteInputs,
}: {
  inputs: Inputs;
  sampleId: string;
  setSampleId: (id: string) => void;
  onWriteInputs: (patch: Partial<Inputs>) => void;
}) {
  const [applied, setApplied] = useState(false);
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
        <h3 className="font-display text-sm font-semibold text-ink">Token lab</h3>
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

// ---------------------------------------------------------------------------
// Section card — scannable bullets + key–value facts
// ---------------------------------------------------------------------------

function SectionCard({ section }: { section: Section }) {
  return (
    <div className="rounded-xl border border-borders bg-tinted-surface/50 p-4">
      <h3 className="font-display text-sm font-semibold text-ink">{section.h}</h3>

      {section.facts && section.facts.length > 0 && (
        <dl className="mt-2 flex flex-col gap-1.5">
          {section.facts.map((f) => (
            <div key={f.k} className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 font-body text-[12px] text-ink/55">{f.k}</dt>
              <dd className="text-right font-mono text-[12px] tabular-nums text-ink">{f.v}</dd>
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
// Comparison table (rows selectable where they map to an Estimate option)
// ---------------------------------------------------------------------------

function ComparisonTable({
  topicId,
  table,
  selectedRow,
  setSelectedRow,
}: {
  topicId: string;
  table: TopicTable;
  selectedRow: string | null;
  setSelectedRow: (v: string | null) => void;
}) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold text-ink">{table.title}</h3>
      <div className="mt-2 overflow-x-auto rag-scroll">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-borders">
              {table.cols.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink/55"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => {
              const first = row[0];
              const selectable = rowToPatch(topicId, first) !== null;
              const active = selectable && selectedRow === first;
              return (
                <tr
                  key={first}
                  onClick={selectable ? () => setSelectedRow(active ? null : first) : undefined}
                  className={[
                    'border-b border-borders/60 last:border-b-0 transition-colors',
                    selectable ? 'cursor-pointer' : '',
                    active
                      ? 'bg-petrol/10'
                      : selectable
                        ? 'hover:bg-tinted-surface/70'
                        : '',
                  ].join(' ')}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={[
                        'px-3 py-2 align-top text-[13px]',
                        ci === 0 ? 'font-body font-medium text-ink' : 'font-mono text-ink/70',
                      ].join(' ')}
                    >
                      <span className="flex items-start gap-1.5">
                        {ci === 0 && selectable && (
                          <span
                            aria-hidden="true"
                            className={[
                              'mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full border',
                              active
                                ? 'border-petrol bg-petrol'
                                : 'border-ink/30 bg-transparent',
                            ].join(' ')}
                          />
                        )}
                        <span>{cell}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {table.rows.some((r) => rowToPatch(topicId, r[0]) !== null) && (
        <p className="mt-1.5 font-mono text-[10px] text-ink/45">
          Select a highlighted row to preselect it in the Estimate.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Links + verify note
// ---------------------------------------------------------------------------

function LinksRow({ topic }: { topic: Topic }) {
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

function VerifyNote() {
  return (
    <p className="font-mono text-[11px] text-amber">
      Illustrative prices, dated June 2026 — verify, prices move. Follow each link for the
      official page.
    </p>
  );
}

// ---------------------------------------------------------------------------
// Use in Estimate button
// ---------------------------------------------------------------------------

function UseInEstimateButton({
  topic,
  selectedRow,
  sampleTokens,
  onApplyPreset,
}: {
  topic: Topic;
  selectedRow: string | null;
  sampleTokens: number | null;
  onApplyPreset: (patch: Partial<Inputs>, field: PresetField) => void;
}) {
  if (!topic.preset) return null;
  const field = topic.preset.field;

  // Compute the patch + label for the current selection.
  let patch: Partial<Inputs> = {};
  let label = 'Open in Estimate';

  if (topic.widget === 'tokenLab' && sampleTokens != null) {
    patch = { tokensPerPage: densityBucketFor(sampleTokens) };
    label = `Use ~${sampleTokens.toLocaleString('en-US')} tok/page in Estimate`;
  } else if (selectedRow) {
    const p = rowToPatch(topic.id, selectedRow) as Partial<Inputs> | null;
    if (p) {
      patch = p;
      label = `Use ${selectedRow} in Estimate`;
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-borders pt-4">
      {topic.preset.note && (
        <p className="font-body text-[12px] text-ink/60">{topic.preset.note}</p>
      )}
      <button
        type="button"
        onClick={() => onApplyPreset(patch, field)}
        className="inline-flex w-fit items-center gap-2 rounded-xl bg-petrol px-4 py-2 font-display text-sm font-medium text-white shadow-sm transition-colors hover:bg-petrol-light focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-surfaces"
      >
        {label}
        <Icon name="arrow-right" className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Glossary view
// ---------------------------------------------------------------------------

function GlossaryView({ selectTopic }: { selectTopic: (id: string) => void }) {
  const [filter, setFilter] = useState('');

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return GLOSSARY;
    return GLOSSARY.filter(
      (g) => g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q),
    );
  }, [filter]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter terms…"
        aria-label="Filter glossary terms"
        className="w-full rounded-xl border border-borders bg-surfaces px-3 py-2 font-body text-sm text-ink placeholder:text-ink/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
      />
      {shown.length === 0 ? (
        <p className="font-body text-sm text-ink/60">No terms match “{filter}”.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((g) => {
            const target = CONTENT.find((t) => t.id === g.see);
            return (
              <div
                key={g.term}
                className="flex flex-col rounded-xl border border-borders bg-tinted-surface/40 p-3"
              >
                <h3 className="font-display text-[13px] font-semibold text-ink">{g.term}</h3>
                <p className="mt-1 flex-1 font-body text-[12px] leading-snug text-ink/75">
                  {g.def}
                </p>
                {target && (
                  <button
                    type="button"
                    onClick={() => selectTopic(g.see)}
                    className="mt-2 inline-flex w-fit items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-petrol hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
                  >
                    → {target.title}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
