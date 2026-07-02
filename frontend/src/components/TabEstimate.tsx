import { useMemo, useRef, useState } from 'react';
import type {
  BucketKey,
  CloudProviderKey,
  EmbedModelKey,
  GenModelKey,
  Inputs,
  MiscItem,
  Overrides,
  VectorDbKey,
} from '../lib/types';
import { DEFAULT_INPUTS } from '../lib/types';
import { calculateCosts, formatNumber } from '../lib/costs';
import { PRICES_AS_OF, RATES } from '../lib/rates';
import { CONTENT } from '../lib/exploreContent';
import { formatMoneyShort, useCurrency } from '../lib/currency';
import Icon from './Icon';
import type { IconName } from './Icon';
import LogSlider from './LogSlider';
import RangeSlider from './RangeSlider';
import SummaryPanel from './estimate/SummaryPanel';
import LearnPanel from './estimate/LearnPanel';
import UnderstandDocsOverlay from './estimate/understand/UnderstandDocsOverlay';
import MiscEditor from './estimate/MiscEditor';
import {
  CustomBadge,
  CustomNameField,
  MoneyField,
  NumberField,
  StatCard,
  TileGroup,
  Toggle,
} from './estimate/primitives';
import type { TileOption } from './estimate/primitives';
import AdvancedDisclosure from './estimate/AdvancedDisclosure';
import { customModelName } from '../lib/labels';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TabEstimateProps {
  inputs: Inputs;
  onChange: (patch: Partial<Inputs>) => void;
  overrides: Overrides;
  onOverridesChange: (o: Overrides) => void;
  misc: MiscItem[];
  onMiscChange: (m: MiscItem[]) => void;
  nextMiscId: () => string;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

type SectionId =
  | 'corpus'
  | 'traffic'
  | 'generation'
  | 'embedding'
  | 'vectordb'
  | 'reranking'
  | 'caching'
  | 'network'
  | 'team';

interface SectionMeta {
  id: SectionId;
  label: string;
  icon: IconName;
  /** Explore topic id backing this section's "Learn" panel (null → no panel). */
  learn: string | null;
}

// Section → topic mapping for the per-section "Learn" panel.
// Corpus → documents (tokens/chunking); Traffic → traffic (requests/tokens);
// People, Tooling & Misc → labor.
// Ordered to follow the RAG pipeline (consistent with the Explore diagram):
// Corpus → Traffic → Embedding → Vector DB → Reranking → Generation →
// Prompt Caching → Network → People, Tooling & Misc.
const SECTIONS: SectionMeta[] = [
  { id: 'corpus', label: 'Corpus', icon: 'file-text', learn: 'documents' },
  { id: 'traffic', label: 'Traffic', icon: 'map', learn: 'traffic' },
  { id: 'embedding', label: 'Embedding model', icon: 'vector', learn: 'embeddings' },
  { id: 'vectordb', label: 'Vector database', icon: 'database', learn: 'vectordb' },
  { id: 'reranking', label: 'Reranking', icon: 'sort', learn: 'reranking' },
  { id: 'generation', label: 'Generation model', icon: 'cpu', learn: 'generation' },
  { id: 'caching', label: 'Prompt Caching', icon: 'layers', learn: 'caching' },
  { id: 'network', label: 'Network', icon: 'globe', learn: 'network' },
  { id: 'team', label: 'People, Tooling & Misc', icon: 'users', learn: 'labor' },
];

// ---------------------------------------------------------------------------
// Tile option builders (labels/specs pulled from RATES)
// ---------------------------------------------------------------------------

function genTile(k: GenModelKey): TileOption<GenModelKey> {
  const m = RATES.genModels[k];
  return {
    value: k,
    title: m.label,
    sub: 'gpuStep' in m ? 'self-host GPU' : `$${m.in} / $${m.out} per 1M`,
    help: 'generation',
  };
}

/** Blended price (input + output $/1M) used to rank models; open-weight = 0. */
function genBlended(k: GenModelKey): number {
  const m = RATES.genModels[k];
  return 'gpuStep' in m ? 0 : m.in + m.out;
}

// Split generation models into a cheap tier (shown up front) and a premium tier
// (behind a disclosure). The 5 cheapest API models by blended price + open-weight
// stay visible; everything pricier is hidden by default.
const GEN_API_KEYS_SORTED = (Object.keys(RATES.genModels) as GenModelKey[])
  .filter((k) => !('gpuStep' in RATES.genModels[k]))
  .sort((a, b) => genBlended(a) - genBlended(b));
const GEN_OPEN_WEIGHT_KEYS = (Object.keys(RATES.genModels) as GenModelKey[]).filter(
  (k) => 'gpuStep' in RATES.genModels[k],
);
const CHEAP_GEN_KEYS: GenModelKey[] = [...GEN_API_KEYS_SORTED.slice(0, 5), ...GEN_OPEN_WEIGHT_KEYS];
const PREMIUM_GEN_KEYS: GenModelKey[] = GEN_API_KEYS_SORTED.slice(5);
const PREMIUM_GEN_KEY_SET = new Set<GenModelKey>(PREMIUM_GEN_KEYS);
const CHEAP_GEN_TILES: TileOption<GenModelKey>[] = CHEAP_GEN_KEYS.map(genTile);
const PREMIUM_GEN_TILES: TileOption<GenModelKey>[] = PREMIUM_GEN_KEYS.map(genTile);

const EMBED_TILES: TileOption<EmbedModelKey>[] = (
  Object.keys(RATES.embedModels) as EmbedModelKey[]
).map((k) => {
  const m = RATES.embedModels[k];
  return { value: k, title: m.label, sub: `$${m.perM}/1M · ${m.dim}d`, help: 'embeddings' };
});

const VDB_TILES: TileOption<VectorDbKey>[] = (
  Object.keys(RATES.vectorDbs) as VectorDbKey[]
).map((k) => {
  const d = RATES.vectorDbs[k];
  const tier = d.managed ? 'managed' : 'self-host';
  const base = 'base' in d ? `$${d.base} base` : `$${d.nodeCost}/node`;
  return { value: k, title: d.label, sub: `${tier} · ${base}`, help: 'vectordb' };
});

const CLOUD_TILES: TileOption<CloudProviderKey>[] = (
  Object.keys(RATES.egress) as CloudProviderKey[]
).map((k) => {
  const e = RATES.egress[k];
  const free = e.freeGB ? ` · ${formatNumber(e.freeGB)}GB free` : '';
  return { value: k, title: e.label, sub: `$${e.perGB}/GB${free}`, help: 'network' };
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TabEstimate({
  inputs,
  onChange,
  overrides,
  onOverridesChange,
  misc,
  onMiscChange,
  nextMiscId,
}: TabEstimateProps) {
  const [active, setActive] = useState<SectionId>('corpus');
  const [sheetOpen, setSheetOpen] = useState(false);
  // Per-section Learn-panel open state (independent; all closed on load).
  const [learnOpen, setLearnOpen] = useState<Partial<Record<SectionId, boolean>>>({});
  const railRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const learnBtnRef = useRef<HTMLButtonElement | null>(null);
  const { currency } = useCurrency();

  // Dismissible scenario hint (resets on reload — a hint, not persisted).
  const [showScenario, setShowScenario] = useState(true);

  // "Understand my documents" overlay + a transient save confirmation.
  const [docOpen, setDocOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const savedTimer = useRef<number | null>(null);

  function handleDocSave(patch: Partial<Inputs>) {
    onChange(patch);
    setDocOpen(false);
    setSavedToast(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavedToast(false), 2400);
  }

  const costs = useMemo(
    () => calculateCosts(inputs, { overrides, misc }),
    [inputs, overrides, misc],
  );

  function moveSection(delta: number) {
    const idx = SECTIONS.findIndex((s) => s.id === active);
    const next = SECTIONS[(idx + delta + SECTIONS.length) % SECTIONS.length];
    setActive(next.id);
    window.requestAnimationFrame(() => railRefs.current[next.id]?.focus());
  }

  function handleRailKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveSection(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveSection(-1);
    }
  }

  // ---- override helpers -------------------------------------------------
  function setOverride(patch: Partial<Overrides>) {
    onOverridesChange({ ...overrides, ...patch });
  }
  function clearOverrideKey(key: keyof Overrides) {
    const next = { ...overrides };
    delete next[key];
    onOverridesChange(next);
  }
  function onPinBucket(key: BucketKey, flatOrNull: number | null) {
    const buckets = { ...(overrides.buckets ?? {}) };
    if (flatOrNull == null) delete buckets[key];
    else buckets[key] = flatOrNull;
    const next: Overrides = { ...overrides, buckets };
    if (Object.keys(buckets).length === 0) delete next.buckets;
    onOverridesChange(next);
  }

  const meta = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0];
  const learnTopic = meta.learn ? CONTENT.find((t) => t.id === meta.learn) ?? null : null;
  const isLearnOpen = !!learnOpen[active];

  function toggleLearn() {
    setLearnOpen((o) => ({ ...o, [active]: !o[active] }));
  }
  function closeLearn() {
    setLearnOpen((o) => ({ ...o, [active]: false }));
    window.requestAnimationFrame(() => learnBtnRef.current?.focus());
  }

  const centerProps = {
    inputs,
    onChange,
    overrides,
    setOverride,
    clearOverrideKey,
    misc,
    onMiscChange,
    nextMiscId,
    vectorSeed: () => Math.max(1, Math.round(costs.vector)),
  };

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[28rem] flex-col gap-3">
      {/* Dismissible scenario chip (also carries the date/illustrative note) */}
      {showScenario && (
        <div className="flex shrink-0 items-start justify-between gap-2 rounded-xl border border-petrol/30 bg-tinted-surface/50 px-3 py-1.5">
          <span className="min-w-0 font-mono text-[11px] text-ink/70">
            <span className="font-semibold text-petrol">
              Scenario: Saarthi (Government Welfare) Phase-3 pilot
            </span>{' '}
            — illustrative defaults (prices as of {PRICES_AS_OF}), edit freely.
          </span>
          <button
            type="button"
            aria-label="Dismiss scenario note"
            onClick={() => setShowScenario(false)}
            className="shrink-0 rounded-md px-1.5 font-mono text-sm text-ink/50 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
          >
            ×
          </button>
        </div>
      )}

      {/* "Understand my documents" entry */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-borders bg-surfaces px-4 py-2.5 shadow-card">
        <div className="flex items-center gap-2">
          <Icon name="file-text" className="h-4 w-4 text-petrol" />
          <span className="font-display text-[13px] font-medium text-ink">
            Not sure of your corpus inputs?
          </span>
          <span className="hidden font-mono text-[10px] text-ink/55 sm:inline">
            analyze real files or preview sample pages
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDocOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2 font-display text-[13px] font-semibold text-white shadow-glow-sm transition-all hover:brightness-110 hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg"
        >
          <Icon name="file-text" className="h-4 w-4" />
          Understand my documents
        </button>
      </div>

      {/* Configuration grid */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 wide:grid wide:grid-cols-[240px_minmax(0,1fr)_320px] wide:gap-6">
      {/* Mobile section chip bar */}
      <div className="flex shrink-0 gap-2 overflow-x-auto rag-scroll pb-1 wide:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={s.id === active ? 'true' : undefined}
            onClick={() => setActive(s.id)}
            className={[
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light',
              s.id === active
                ? 'border-petrol bg-petrol text-white'
                : 'border-borders bg-surfaces text-ink hover:bg-tinted-surface',
            ].join(' ')}
          >
            <Icon name={s.icon} className="h-4 w-4" />
            <span className="whitespace-nowrap font-display font-medium">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Desktop rail */}
      <nav aria-label="Configuration sections" className="hidden h-full flex-col gap-1 wide:flex">
        {SECTIONS.map((s) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              ref={(el) => {
                railRefs.current[s.id] = el;
              }}
              type="button"
              aria-current={isActive ? 'true' : undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(s.id)}
              onKeyDown={handleRailKey}
              className={[
                'flex items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg',
                isActive ? 'bg-petrol text-white shadow-sm' : 'text-ink hover:bg-tinted-surface',
              ].join(' ')}
            >
              <span
                className={[
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  isActive ? 'bg-white/15 text-white' : 'bg-tinted-surface text-petrol',
                ].join(' ')}
              >
                <Icon name={s.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="font-display text-[13px] font-medium">{s.label}</span>
                  {sectionConfigured(s.id, inputs, overrides) && (
                    <span
                      className={isActive ? 'text-white/80' : 'text-value-green'}
                      aria-label="configured"
                    >
                      ✓
                    </span>
                  )}
                </span>
                <span
                  className={[
                    'mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px]',
                    isActive ? 'text-white/70' : 'text-ink/55',
                  ].join(' ')}
                >
                  <span className="truncate">{sectionSummary(s.id, inputs, overrides)}</span>
                  {sectionOverridden(s.id, inputs, overrides) && <CustomBadge />}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Center pane (only region that scrolls) */}
      <section
        aria-label={`${meta.label} settings`}
        className={[
          'min-h-0 flex-1 overflow-y-auto rag-scroll rounded-2xl border border-borders bg-surfaces p-5 shadow-card md:p-6',
        ].join(' ')}
      >
        <header className="mb-4 flex items-center justify-between gap-2.5">
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tinted-surface text-petrol">
              <Icon name={meta.icon} className="h-4.5 w-4.5" />
            </span>
            <h2 className="font-display text-lg font-semibold text-ink">{meta.label}</h2>
          </span>
          {learnTopic && (
            <button
              ref={learnBtnRef}
              type="button"
              aria-expanded={isLearnOpen}
              onClick={toggleLearn}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-ink/55 transition-colors hover:bg-tinted-surface hover:text-petrol focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
            >
              <Icon name="book" className="h-3.5 w-3.5" />
              {isLearnOpen ? 'Hide' : 'Learn'}
            </button>
          )}
        </header>
        {learnTopic && (
          <LearnPanel
            key={active}
            topic={learnTopic}
            open={isLearnOpen}
            onClose={closeLearn}
            inputs={inputs}
            onWriteInputs={onChange}
          />
        )}
        <SectionBody section={active} {...centerProps} />
      </section>

      {/* Desktop summary */}
      <aside className="hidden h-full min-h-0 overflow-y-auto rag-scroll rounded-2xl border border-borders bg-surfaces p-5 shadow-card wide:block">
        <SummaryPanel costs={costs} overrides={overrides} misc={misc} onPinBucket={onPinBucket} />
      </aside>

      {/* Mobile pinned total + bottom sheet */}
      <div className="wide:hidden">
        {sheetOpen && (
          <div className="mb-2 max-h-[45vh] overflow-y-auto rag-scroll rounded-2xl border border-borders bg-surfaces p-4 shadow-card">
            <SummaryPanel
              costs={costs}
              overrides={overrides}
              misc={misc}
              onPinBucket={onPinBucket}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-2xl border border-borders bg-ink px-4 py-3 text-white shadow-card"
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-white/70">
            {sheetOpen ? 'Hide breakdown' : 'Monthly total'}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums">
              {formatMoneyShort(costs.total, currency)}
            </span>
            <span className="text-white/60">{sheetOpen ? '▾' : '▴'}</span>
          </span>
        </button>
      </div>
      </div>

      {docOpen && (
        <UnderstandDocsOverlay
          inputs={inputs}
          onSave={handleDocSave}
          onClose={() => setDocOpen(false)}
        />
      )}

      {savedToast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-4 py-2 font-mono text-[12px] text-white shadow-card"
        >
          ✓ Saved to estimate
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Center pane body
// ---------------------------------------------------------------------------

interface CenterProps {
  inputs: Inputs;
  onChange: (patch: Partial<Inputs>) => void;
  overrides: Overrides;
  setOverride: (patch: Partial<Overrides>) => void;
  clearOverrideKey: (key: keyof Overrides) => void;
  misc: MiscItem[];
  onMiscChange: (m: MiscItem[]) => void;
  nextMiscId: () => string;
  vectorSeed: () => number;
}

function SectionBody({ section, ...p }: { section: SectionId } & CenterProps) {
  switch (section) {
    case 'corpus':
      return <CorpusSection {...p} />;
    case 'traffic':
      return <TrafficSection {...p} />;
    case 'generation':
      return <GenerationSection {...p} />;
    case 'embedding':
      return <EmbeddingSection {...p} />;
    case 'vectordb':
      return <VectorDbSection {...p} />;
    case 'reranking':
      return <RerankingSection {...p} />;
    case 'caching':
      return <CachingSection {...p} />;
    case 'network':
      return <NetworkSection {...p} />;
    case 'team':
      return <TeamSection {...p} />;
  }
}

// ---- Corpus ------------------------------------------------------------

function CorpusSection({ inputs, onChange }: CenterProps) {
  const [adv, setAdv] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <StatCard>
        <LogSlider
          label="Documents"
          value={inputs.documents}
          min={1_000}
          max={2_000_000}
          floorZero
          minLabel="0"
          format={formatNumber}
          onChange={(v) => onChange({ documents: v })}
        />
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-borders/60 pt-3">
          <div className="w-40">
            <NumberField
              label="Exact count"
              value={inputs.documents}
              min={0}
              max={2_000_000}
              step={1000}
              suffix="docs"
              onChange={(v) =>
                onChange({
                  documents: Number.isFinite(v)
                    ? Math.min(2_000_000, Math.max(0, Math.round(v)))
                    : 0,
                })
              }
            />
          </div>
          <p className="pb-1 font-mono text-[10px] text-ink/50">
            Type <span className="text-ink/70">0</span> for a query-only / no-corpus estimate.
          </p>
        </div>
      </StatCard>

      <TileGroup
        label="Avg document size"
        value={inputs.avgDocSizePages}
        options={[
          { value: 'short', title: 'Short', sub: '3 pages' },
          { value: 'standard', title: 'Standard', sub: '10 pages' },
          { value: 'long', title: 'Long', sub: '40 pages' },
          { value: 'report', title: 'Report', sub: '120 pages' },
        ]}
        columns={4}
        onChange={(v) => onChange({ avgDocSizePages: v })}
        custom={{
          active: inputs.avgDocSizePages === 'custom',
          onSelect: () =>
            onChange({
              avgDocSizePages: 'custom',
              avgDocSizePagesCustom: inputs.avgDocSizePagesCustom ?? 10,
            }),
        }}
      />
      {inputs.avgDocSizePages === 'custom' && (
        <div className="w-40">
          <NumberField
            label="Pages / document"
            value={inputs.avgDocSizePagesCustom ?? 10}
            onChange={(v) => onChange({ avgDocSizePagesCustom: v })}
            suffix="pg"
          />
        </div>
      )}

      <AdvancedDisclosure open={adv} onToggle={() => setAdv((o) => !o)}>
        <div>
          <TileGroup
            label="Tokens per page"
            value={inputs.tokensPerPage}
            options={[
              { value: 'sparse', title: 'Sparse', sub: '300 tok' },
              { value: 'standard', title: 'Standard', sub: '500 tok' },
              { value: 'dense', title: 'Dense', sub: '650 tok' },
            ]}
            columns={3}
            onChange={(v) => onChange({ tokensPerPage: v })}
            custom={{
              active: inputs.tokensPerPage === 'custom',
              onSelect: () =>
                onChange({
                  tokensPerPage: 'custom',
                  tokensPerPageCustom: inputs.tokensPerPageCustom ?? 500,
                }),
            }}
          />
          {inputs.tokensPerPage === 'custom' && (
            <div className="mt-3 w-40">
              <NumberField
                label="Tokens / page"
                value={inputs.tokensPerPageCustom ?? 500}
                onChange={(v) => onChange({ tokensPerPageCustom: v })}
                suffix="tok"
              />
            </div>
          )}
        </div>

        <TileGroup
          label="Chunk size"
          value={inputs.chunkSize}
          options={[
            { value: '256', title: '256', sub: 'tokens' },
            { value: '512', title: '512', sub: 'tokens' },
            { value: '1024', title: '1024', sub: 'tokens' },
          ]}
          columns={3}
          onChange={(v) => onChange({ chunkSize: v })}
        />
        <TileGroup
          label="Chunk overlap"
          value={inputs.chunkOverlap}
          options={[
            { value: '0', title: '0%', sub: 'no overlap' },
            { value: '0.10', title: '10%', sub: 'balanced' },
            { value: '0.25', title: '25%', sub: 'max recall' },
          ]}
          columns={3}
          onChange={(v) => onChange({ chunkOverlap: v })}
        />

        <div className="grid grid-cols-2 gap-3">
          <PctField
            label="Duplicate chunks"
            value={inputs.dupChunkPct}
            onChange={(f) => onChange({ dupChunkPct: f })}
          />
          <NumberField
            label="New documents / month"
            value={inputs.newDocsPerMonth}
            min={0}
            step={1}
            suffix="docs"
            onChange={(v) => onChange({ newDocsPerMonth: Math.max(0, Math.round(v)) })}
          />
        </div>

        <div className="rounded-xl border border-borders bg-surfaces p-3.5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-petrol">
            Ingestion detail (one-time / per new doc)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <PctField label="Pages needing OCR" value={inputs.ocrPct} onChange={(f) => onChange({ ocrPct: f })} />
            <NumberField label="OCR $/page" value={inputs.ocrPerPage} prefix="$" onChange={(v) => onChange({ ocrPerPage: Math.max(0, v) })} />
            <NumberField label="Parser $/page" value={inputs.parserPerPage} prefix="$" onChange={(v) => onChange({ parserPerPage: Math.max(0, v) })} />
            <NumberField label="Tables / doc" value={inputs.tablesPerDoc} min={0} onChange={(v) => onChange({ tablesPerDoc: Math.max(0, v) })} />
            <NumberField label="Table extract $" value={inputs.tableExtractPer} prefix="$" onChange={(v) => onChange({ tableExtractPer: Math.max(0, v) })} />
            <NumberField label="Images / doc" value={inputs.imagesPerDoc} min={0} onChange={(v) => onChange({ imagesPerDoc: Math.max(0, v) })} />
            <NumberField label="Image extract $" value={inputs.imageExtractPer} prefix="$" onChange={(v) => onChange({ imageExtractPer: Math.max(0, v) })} />
          </div>
        </div>
      </AdvancedDisclosure>
    </div>
  );
}

// ---- Traffic -----------------------------------------------------------

function TrafficSection({ inputs, onChange }: CenterProps) {
  const [adv, setAdv] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard>
          <LogSlider
            label="Requests / month"
            value={inputs.requestsPerMonth}
            min={1_000}
            max={10_000_000}
            format={formatNumber}
            onChange={(v) => onChange({ requestsPerMonth: v })}
          />
        </StatCard>
        <StatCard>
          <RangeSlider
            label="Output tokens"
            value={inputs.outputTokens}
            min={100}
            max={2_000}
            step={1}
            format={(n) => n.toLocaleString('en-US')}
            onChange={(v) => onChange({ outputTokens: v })}
          />
        </StatCard>
      </div>

      <AdvancedDisclosure open={adv} onToggle={() => setAdv((o) => !o)}>
        <TileGroup
          label="Top-K chunks retrieved"
          value={inputs.topK}
          options={[
            { value: '3', title: 'k = 3' },
            { value: '5', title: 'k = 5' },
            { value: '10', title: 'k = 10' },
            { value: '20', title: 'k = 20' },
          ]}
          columns={4}
          onChange={(v) => onChange({ topK: v })}
        />
        <TileGroup
          label="Rerank candidate pool"
          value={inputs.rerankCandidatePool}
          options={[
            { value: '25', title: '25', sub: 'candidates' },
            { value: '50', title: '50', sub: 'candidates' },
            { value: '100', title: '100', sub: 'candidates' },
          ]}
          columns={3}
          onChange={(v) => onChange({ rerankCandidatePool: v })}
        />
        <div>
          <TileGroup
            label="System prompt size"
            value={inputs.systemPromptTokens}
            options={[
              { value: '500', title: '500', sub: 'tokens' },
              { value: '1500', title: '1,500', sub: 'tokens' },
              { value: '3000', title: '3,000', sub: 'tokens' },
            ]}
            columns={3}
            onChange={(v) => onChange({ systemPromptTokens: v })}
            custom={{
              active: inputs.systemPromptTokens === 'custom',
              onSelect: () =>
                onChange({
                  systemPromptTokens: 'custom',
                  systemPromptTokensCustom: inputs.systemPromptTokensCustom ?? 1500,
                }),
            }}
          />
          {inputs.systemPromptTokens === 'custom' && (
            <div className="mt-3 w-40">
              <NumberField
                label="System prompt tokens"
                value={inputs.systemPromptTokensCustom ?? 1500}
                onChange={(v) => onChange({ systemPromptTokensCustom: v })}
                suffix="tok"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard>
            <RangeSlider
              label="User query tokens"
              value={inputs.userQueryTokens}
              min={20}
              max={2_000}
              step={1}
              format={(n) => n.toLocaleString('en-US')}
              onChange={(v) => onChange({ userQueryTokens: v })}
            />
          </StatCard>
          <StatCard>
            <RangeSlider
              label="Avg session turns"
              value={inputs.avgSessionTurns}
              min={1}
              max={12}
              step={1}
              format={(n) => n.toString()}
              onChange={(v) => onChange({ avgSessionTurns: v })}
            />
          </StatCard>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard>
            <RangeSlider
              label="Conversation history tokens"
              value={inputs.conversationHistoryTokens}
              min={0}
              max={4_000}
              step={1}
              format={(n) => n.toLocaleString('en-US')}
              onChange={(v) => onChange({ conversationHistoryTokens: Math.max(0, Math.round(v)) })}
            />
          </StatCard>
          <div className="flex flex-col gap-2">
            <Toggle
              label="Safety / moderation pass"
              checked={inputs.moderationEnabled}
              onChange={(v) => onChange({ moderationEnabled: v })}
              hint="scans request input + output for safety"
            />
            {inputs.moderationEnabled && (
              <div className="w-40">
                <NumberField
                  label="Moderation $ / 1M tokens"
                  value={inputs.moderationPerM}
                  prefix="$"
                  onChange={(v) => onChange({ moderationPerM: Math.max(0, v) })}
                />
              </div>
            )}
          </div>
        </div>
      </AdvancedDisclosure>
    </div>
  );
}

// ---- Generation --------------------------------------------------------

function GenerationSection({
  inputs,
  onChange,
  overrides,
  setOverride,
  clearOverrideKey,}: CenterProps) {
  const custom = overrides.genModel;
  const isGpu = custom?.gpuMonthly != null;
  const [advOpen, setAdvOpen] = useState(false);
  // Auto-expand the premium tier whenever the current selection is a premium
  // model, so a selected tile is never hidden.
  const premiumOpen = advOpen || PREMIUM_GEN_KEY_SET.has(inputs.genModel);
  return (
    <div className="flex flex-col gap-4">
      <TileGroup
        label="Generation model"
        value={inputs.genModel}
        options={CHEAP_GEN_TILES}
        columns={2}
        onChange={(v) => {
          onChange({ genModel: v });
          if (overrides.genModel) clearOverrideKey('genModel');
        }}
        custom={{
          active: custom != null,
          title: custom ? customModelName(custom) : undefined,
          sub: custom ? 'custom' : undefined,
          onSelect: () => {
            const m = RATES.genModels[inputs.genModel];
            setOverride({
              genModel: 'gpuStep' in m ? { gpuMonthly: 1080 } : { in: m.in, out: m.out },
            });
          },
        }}
      />

      <AdvancedDisclosure
        open={premiumOpen}
        onToggle={() => setAdvOpen((o) => !o)}
        label="Show premium / higher-accuracy models"
      >
        <TileGroup
          label="Premium models"
          value={inputs.genModel}
          options={PREMIUM_GEN_TILES}
          columns={2}
          onChange={(v) => {
            onChange({ genModel: v });
            if (overrides.genModel) clearOverrideKey('genModel');
          }}
        />
      </AdvancedDisclosure>

      {custom && (
        <CustomPanel onReset={() => clearOverrideKey('genModel')}>
          <CustomNameField
            value={custom.name ?? ''}
            onChange={(name) => setOverride({ genModel: { ...custom, name } })}
          />
          <div className="mb-2 mt-3 inline-flex overflow-hidden rounded-lg border border-borders">
            <ModeBtn
              active={!isGpu}
              label="API rates"
              onClick={() =>
                setOverride({ genModel: { name: custom.name, in: custom.in ?? 2.5, out: custom.out ?? 15 } })
              }
            />
            <ModeBtn
              active={isGpu}
              label="Flat $/mo"
              onClick={() =>
                setOverride({ genModel: { name: custom.name, gpuMonthly: custom.gpuMonthly ?? 1080 } })
              }
            />
          </div>
          {isGpu ? (
            <NumberField
              label="Flat generation $/mo"
              value={custom.gpuMonthly ?? 0}
              prefix="$"
              onChange={(v) => setOverride({ genModel: { name: custom.name, gpuMonthly: v } })}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Input $/1M"
                value={custom.in ?? 0}
                prefix="$"
                onChange={(v) => setOverride({ genModel: { ...custom, in: v } })}
              />
              <NumberField
                label="Output $/1M"
                value={custom.out ?? 0}
                prefix="$"
                onChange={(v) => setOverride({ genModel: { ...custom, out: v } })}
              />
            </div>
          )}
        </CustomPanel>
      )}
    </div>
  );
}

// ---- Embedding ---------------------------------------------------------

function EmbeddingSection({
  inputs,
  onChange,
  overrides,
  setOverride,
  clearOverrideKey,}: CenterProps) {
  const custom = overrides.embedModel;
  return (
    <div className="flex flex-col gap-4">
      <TileGroup
        label="Embedding model"
        value={inputs.embedModel}
        options={EMBED_TILES}
        columns={2}
        onChange={(v) => {
          onChange({ embedModel: v });
          if (overrides.embedModel) clearOverrideKey('embedModel');
        }}
        custom={{
          active: custom != null,
          title: custom ? customModelName(custom) : undefined,
          sub: custom ? 'custom' : undefined,
          onSelect: () => {
            const m = RATES.embedModels[inputs.embedModel];
            setOverride({ embedModel: { perM: m.perM, dim: m.dim } });
          },
        }}
      />
      {custom && (
        <CustomPanel onReset={() => clearOverrideKey('embedModel')}>
          <div className="mb-3">
            <CustomNameField
              value={custom.name ?? ''}
              onChange={(name) => setOverride({ embedModel: { ...custom, name } })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="$/1M tokens"
              value={custom.perM}
              prefix="$"
              onChange={(v) => setOverride({ embedModel: { ...custom, perM: v } })}
            />
            <NumberField
              label="Dimensions"
              value={custom.dim}
              suffix="d"
              onChange={(v) => setOverride({ embedModel: { ...custom, dim: v } })}
            />
          </div>
        </CustomPanel>
      )}
    </div>
  );
}

// ---- Vector DB ---------------------------------------------------------

function VectorDbSection({
  inputs,
  onChange,
  overrides,
  setOverride,
  clearOverrideKey,  vectorSeed,
}: CenterProps) {
  const custom = overrides.vectorDb;
  const advanced = custom ? custom.flatMonthly == null : false;
  return (
    <div className="flex flex-col gap-4">
      <TileGroup
        label="Vector database"
        value={inputs.vectorDb}
        options={VDB_TILES}
        columns={2}
        onChange={(v) => {
          onChange({ vectorDb: v });
          if (overrides.vectorDb) clearOverrideKey('vectorDb');
        }}
        custom={{
          active: custom != null,
          title: custom ? customModelName(custom) : undefined,
          sub: custom ? 'custom' : undefined,
          onSelect: () => setOverride({ vectorDb: { flatMonthly: vectorSeed() } }),
        }}
      />
      {custom && (
        <CustomPanel onReset={() => clearOverrideKey('vectorDb')}>
          <div className="mb-3">
            <CustomNameField
              value={custom.name ?? ''}
              onChange={(name) => setOverride({ vectorDb: { ...custom, name } })}
            />
          </div>
          {advanced ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Base $/mo"
                  value={custom.base ?? 0}
                  prefix="$"
                  onChange={(v) => setOverride({ vectorDb: { ...custom, base: v } })}
                />
                <NumberField
                  label="$/GB"
                  value={custom.perGB ?? 0}
                  prefix="$"
                  onChange={(v) => setOverride({ vectorDb: { ...custom, perGB: v } })}
                />
                <NumberField
                  label="$/1M reads"
                  value={custom.readsPerM ?? 0}
                  prefix="$"
                  onChange={(v) => setOverride({ vectorDb: { ...custom, readsPerM: v } })}
                />
                <NumberField
                  label="$/1M writes"
                  value={custom.writesPerM ?? 0}
                  prefix="$"
                  onChange={(v) => setOverride({ vectorDb: { ...custom, writesPerM: v } })}
                />
              </div>
              <button
                type="button"
                onClick={() => setOverride({ vectorDb: { name: custom.name, flatMonthly: vectorSeed() } })}
                className="w-fit font-mono text-[11px] text-petrol hover:underline"
              >
                ← simple flat monthly
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="w-44">
                <NumberField
                  label="Flat $/mo"
                  value={custom.flatMonthly ?? 0}
                  prefix="$"
                  onChange={(v) => setOverride({ vectorDb: { flatMonthly: v } })}
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setOverride({
                    vectorDb: {
                      name: custom.name,
                      base: RATES.vectorDbs.pinecone.base,
                      perGB: RATES.vectorDbs.pinecone.perGB,
                      readsPerM: RATES.vectorDbs.pinecone.readsPerM,
                      writesPerM: RATES.vectorDbs.pinecone.writesPerM,
                    },
                  })
                }
                className="w-fit font-mono text-[11px] text-petrol hover:underline"
              >
                advanced (base + per-GB + reads + writes) →
              </button>
            </div>
          )}
        </CustomPanel>
      )}
    </div>
  );
}

// ---- Reranking ---------------------------------------------------------

function RerankingSection({
  inputs,
  onChange,
  overrides,
  setOverride,
  clearOverrideKey,}: CenterProps) {
  const custom = overrides.reranker;
  const isGpu = custom?.gpuMonthly != null;
  return (
    <div className="flex flex-col gap-4">
      <TileGroup
        label="Reranker"
        value={inputs.reranker}
        options={[
          { value: 'none', title: 'None', sub: 'skip reranking', help: 'reranking' },
          {
            value: 'cohere',
            title: 'Cohere rerank',
            sub: `$${RATES.rerankerPer1k.toFixed(2)}/1k searches`,
            help: 'reranking',
          },
        ]}
        columns={2}
        onChange={(v) => {
          onChange({ reranker: v });
          if (overrides.reranker) clearOverrideKey('reranker');
        }}
        custom={{
          active: custom != null,
          title: custom ? customModelName(custom) : undefined,
          sub: custom ? 'custom' : undefined,
          onSelect: () => setOverride({ reranker: { per1k: RATES.rerankerPer1k } }),
        }}
      />
      {custom && (
        <CustomPanel onReset={() => clearOverrideKey('reranker')}>
          <CustomNameField
            value={custom.name ?? ''}
            onChange={(name) => setOverride({ reranker: { ...custom, name } })}
          />
          <div className="mb-2 mt-3 inline-flex overflow-hidden rounded-lg border border-borders">
            <ModeBtn
              active={!isGpu}
              label="Per 1k searches"
              onClick={() =>
                setOverride({ reranker: { name: custom.name, per1k: custom.per1k ?? RATES.rerankerPer1k } })
              }
            />
            <ModeBtn
              active={isGpu}
              label="Flat $/mo (GPU)"
              onClick={() =>
                setOverride({ reranker: { name: custom.name, gpuMonthly: custom.gpuMonthly ?? 96 } })
              }
            />
          </div>
          {isGpu ? (
            <NumberField
              label="Reranker GPU $/mo"
              value={custom.gpuMonthly ?? 0}
              prefix="$"
              onChange={(v) => setOverride({ reranker: { name: custom.name, gpuMonthly: v } })}
            />
          ) : (
            <div className="w-44">
              <NumberField
                label="$ / 1k searches"
                value={custom.per1k ?? 0}
                prefix="$"
                onChange={(v) => setOverride({ reranker: { name: custom.name, per1k: v } })}
              />
            </div>
          )}
        </CustomPanel>
      )}
    </div>
  );
}

// ---- Caching -----------------------------------------------------------

function CachingSection({ inputs, onChange }: CenterProps) {
  return (
    <div className="flex flex-col gap-5">
      <TileGroup
        label="Cache TTL"
        value={inputs.cacheTTL}
        options={[
          { value: 'off', title: 'Off', sub: 'no caching', help: 'caching' },
          { value: '5min', title: '5-min', sub: 'write ×1.25', help: 'caching' },
          { value: '1hour', title: '1-hour', sub: 'write ×2', help: 'caching' },
        ]}
        columns={3}
        onChange={(v) => onChange({ cacheTTL: v })}      />
      <TileGroup
        label="Prompt cache hit rate"
        value={inputs.cacheHitRate}
        options={[
          { value: '0', title: '0%', sub: 'no hits' },
          { value: '0.2', title: '20%', sub: 'low' },
          { value: '0.5', title: '50%', sub: 'typical' },
          { value: '0.75', title: '75%', sub: 'good' },
          { value: '0.9', title: '90%', sub: 'best case' },
        ]}
        columns={3}
        onChange={(v) => onChange({ cacheHitRate: v })}
      />
      {inputs.cacheTTL === 'off' && (
        <p className="font-mono text-[11px] text-ink/55">
          Prompt caching off — the hit-rate discount and write surcharge are both disabled.
        </p>
      )}

      <div className="rounded-xl border border-borders bg-surfaces p-3.5">
        <div className="w-40">
          <NumberField
            label="Semantic cache hit rate"
            value={Math.round((inputs.semanticCacheHitRate ?? 0) * 100)}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={(v) =>
              onChange({
                semanticCacheHitRate: Math.min(1, Math.max(0, (Number.isFinite(v) ? v : 0) / 100)),
              })
            }
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-ink/55">
          Distinct from prompt caching — the share of queries answered from a semantic cache that
          skip generation entirely.
        </p>
      </div>
    </div>
  );
}

// ---- Network -----------------------------------------------------------

function NetworkSection({
  inputs,
  onChange,
  overrides,
  setOverride,
  clearOverrideKey,
}: CenterProps) {
  const custom = overrides.cloud;
  const [adv, setAdv] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <TileGroup
        label="Cloud provider"
        value={inputs.cloudProvider}
        options={CLOUD_TILES}
        columns={3}
        onChange={(v) => {
          onChange({ cloudProvider: v });
          if (overrides.cloud) clearOverrideKey('cloud');
        }}
        custom={{
          active: custom != null,
          title: custom ? customModelName(custom) : undefined,
          sub: custom ? 'custom' : undefined,
          onSelect: () => {
            const e = RATES.egress[inputs.cloudProvider];
            setOverride({ cloud: { perGB: e.perGB, freeGB: e.freeGB } });
          },
        }}
      />
      {custom && (
        <CustomPanel onReset={() => clearOverrideKey('cloud')}>
          <div className="mb-3">
            <CustomNameField
              value={custom.name ?? ''}
              onChange={(name) => setOverride({ cloud: { ...custom, name } })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="$/GB egress"
              value={custom.perGB}
              prefix="$"
              onChange={(v) => setOverride({ cloud: { ...custom, perGB: v } })}
            />
            <NumberField
              label="Free tier GB"
              value={custom.freeGB}
              suffix="GB"
              onChange={(v) => setOverride({ cloud: { ...custom, freeGB: v } })}
            />
          </div>
        </CustomPanel>
      )}

      <AdvancedDisclosure open={adv} onToggle={() => setAdv((o) => !o)}>
        <div className="flex flex-col gap-2">
          <Toggle
            label="Retrieved context crosses a network boundary"
            checked={inputs.crossRegion}
            onChange={(v) => onChange({ crossRegion: v })}
            hint="adds retrieved-context bytes to egress"
          />
          <Toggle
            label="NAT Gateway surcharge"
            checked={inputs.natSurcharge}
            onChange={(v) => onChange({ natSurcharge: v })}
            hint={`+$${RATES.natPerGB}/GB on all egress`}
          />
          <Toggle
            label="Cross-AZ traffic surcharge"
            checked={inputs.crossAz}
            onChange={(v) => onChange({ crossAz: v })}
            hint={`+$${RATES.crossAzPerGB}/GB (both ways)`}
          />
        </div>
      </AdvancedDisclosure>
    </div>
  );
}

// ---- People, Tooling & Misc --------------------------------------------

function TeamSection({ inputs, onChange, misc, onMiscChange, nextMiscId }: CenterProps) {
  const [adv, setAdv] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard>
          <RangeSlider
            label="Team size"
            value={inputs.teamSize}
            min={0}
            max={8}
            step={1}
            format={(n) => `${n} engineer${n === 1 ? '' : 's'}`}
            onChange={(v) => onChange({ teamSize: v })}
          />
        </StatCard>
        <StatCard>
          <div className="flex flex-col gap-1">
            <MoneyField
              label="Loaded cost per engineer / month"
              valueUsd={inputs.laborMonthly}
              min={0}
              step={500}
              onChangeUsd={(usd) => onChange({ laborMonthly: Math.max(0, usd) })}
            />
            <p className="font-mono text-[10px] text-ink/50">
              0 by default — enter a loaded cost to add engineering labor.
            </p>
          </div>
        </StatCard>
        <StatCard>
          <div className="flex flex-col gap-1">
            <PctField
              label="Maintenance fraction"
              value={inputs.maintFrac}
              onChange={(f) => onChange({ maintFrac: f })}
            />
            <p className="font-mono text-[10px] text-ink/50">
              engineering labor = team size × loaded cost × maintenance fraction.
            </p>
          </div>
        </StatCard>
      </div>

      <AdvancedDisclosure open={adv} onToggle={() => setAdv((o) => !o)}>
        <StatCard>
          <div className="flex flex-col gap-1">
            <MoneyField
              label="Infrastructure / month (flat)"
              valueUsd={inputs.infraMonthly}
              min={0}
              step={5}
              onChangeUsd={(usd) => onChange({ infraMonthly: Math.max(0, usd) })}
            />
            <p className="font-mono text-[10px] text-ink/50">
              App servers, load balancer, Redis, monitoring, storage (Excel infra block).
            </p>
          </div>
        </StatCard>
        <MiscEditor misc={misc} onChange={onMiscChange} nextId={nextMiscId} />
      </AdvancedDisclosure>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

/** A percentage input backed by a 0..1 fraction. */
function PctField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (frac: number) => void;
}) {
  return (
    <NumberField
      label={label}
      value={Math.round((value ?? 0) * 100)}
      min={0}
      max={100}
      step={1}
      suffix="%"
      onChange={(v) => onChange(Math.min(1, Math.max(0, (Number.isFinite(v) ? v : 0) / 100)))}
    />
  );
}

function CustomPanel({
  children,
  onReset,
}: {
  children: React.ReactNode;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber/40 bg-amber/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <CustomBadge />
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink/50">
            feeds the cost model
          </span>
        </span>
        <button
          type="button"
          onClick={onReset}
          className="font-mono text-[11px] text-petrol hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          reset to preset
        </button>
      </div>
      {children}
    </div>
  );
}

function ModeBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
        active ? 'bg-petrol text-white' : 'bg-surfaces text-ink/60 hover:bg-tinted-surface',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Rail summary / status helpers
// ---------------------------------------------------------------------------

function docSizeText(inputs: Inputs): string {
  if (inputs.avgDocSizePages === 'custom') return `${inputs.avgDocSizePagesCustom ?? 10}pg`;
  return { short: '3pg', standard: '10pg', long: '40pg', report: '120pg' }[
    inputs.avgDocSizePages
  ];
}

function tokensText(inputs: Inputs): string {
  if (inputs.tokensPerPage === 'custom') return `${inputs.tokensPerPageCustom ?? 500}tok`;
  return { sparse: '300tok', standard: '500tok', dense: '650tok' }[inputs.tokensPerPage];
}

function sectionSummary(id: SectionId, inputs: Inputs, overrides: Overrides): string {
  switch (id) {
    case 'corpus':
      return `${formatNumber(inputs.documents)} docs · ${docSizeText(inputs)} · ${tokensText(inputs)}`;
    case 'traffic':
      return `${formatNumber(inputs.requestsPerMonth)}/mo · k=${inputs.topK}`;
    case 'generation':
      return overrides.genModel
        ? customModelName(overrides.genModel)
        : RATES.genModels[inputs.genModel].label;
    case 'embedding':
      return overrides.embedModel
        ? customModelName(overrides.embedModel)
        : RATES.embedModels[inputs.embedModel].label;
    case 'vectordb':
      return overrides.vectorDb
        ? customModelName(overrides.vectorDb)
        : RATES.vectorDbs[inputs.vectorDb].label;
    case 'reranking':
      return overrides.reranker
        ? customModelName(overrides.reranker)
        : inputs.reranker === 'none'
          ? 'No reranker'
          : 'Cohere rerank';
    case 'caching': {
      const ttl = { off: 'Off', '5min': '5-min', '1hour': '1-hour' }[inputs.cacheTTL];
      const hit = Math.round(Number(inputs.cacheHitRate) * 100);
      return inputs.cacheTTL === 'off' ? 'Caching off' : `${ttl} · ${hit}% hit`;
    }
    case 'network':
      return overrides.cloud
        ? customModelName(overrides.cloud)
        : RATES.egress[inputs.cloudProvider].label;
    case 'team':
      return `${inputs.teamSize} engineer${inputs.teamSize === 1 ? '' : 's'}`;
  }
}

/** ✓ when the section differs from its default (i.e. the user configured it). */
function sectionConfigured(id: SectionId, inputs: Inputs, overrides: Overrides): boolean {
  if (sectionOverridden(id, inputs, overrides)) return true;
  const d = DEFAULT_INPUTS;
  switch (id) {
    case 'corpus':
      return (
        inputs.documents !== d.documents ||
        inputs.avgDocSizePages !== d.avgDocSizePages ||
        inputs.tokensPerPage !== d.tokensPerPage ||
        inputs.chunkSize !== d.chunkSize ||
        inputs.chunkOverlap !== d.chunkOverlap
      );
    case 'traffic':
      return (
        inputs.requestsPerMonth !== d.requestsPerMonth ||
        inputs.topK !== d.topK ||
        inputs.rerankCandidatePool !== d.rerankCandidatePool ||
        inputs.systemPromptTokens !== d.systemPromptTokens ||
        inputs.userQueryTokens !== d.userQueryTokens ||
        inputs.outputTokens !== d.outputTokens ||
        inputs.avgSessionTurns !== d.avgSessionTurns
      );
    case 'generation':
      return inputs.genModel !== d.genModel;
    case 'embedding':
      return inputs.embedModel !== d.embedModel;
    case 'vectordb':
      return inputs.vectorDb !== d.vectorDb;
    case 'reranking':
      return inputs.reranker !== d.reranker;
    case 'caching':
      return inputs.cacheTTL !== d.cacheTTL || inputs.cacheHitRate !== d.cacheHitRate;
    case 'network':
      return (
        inputs.cloudProvider !== d.cloudProvider ||
        inputs.crossRegion !== d.crossRegion ||
        inputs.natSurcharge !== d.natSurcharge ||
        inputs.crossAz !== d.crossAz
      );
    case 'team':
      return inputs.teamSize !== d.teamSize;
  }
}

/** Whether a section carries a custom (hand-set) pricing/value override. */
function sectionOverridden(id: SectionId, inputs: Inputs, overrides: Overrides): boolean {
  switch (id) {
    case 'corpus':
      return inputs.avgDocSizePages === 'custom' || inputs.tokensPerPage === 'custom';
    case 'traffic':
      return inputs.systemPromptTokens === 'custom';
    case 'generation':
      return overrides.genModel != null;
    case 'embedding':
      return overrides.embedModel != null;
    case 'vectordb':
      return overrides.vectorDb != null;
    case 'reranking':
      return overrides.reranker != null;
    case 'network':
      return overrides.cloud != null;
    default:
      return false;
  }
}
