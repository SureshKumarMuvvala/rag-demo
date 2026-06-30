import type {
  CacheRateKey,
  ChunkSizeKey,
  CloudProviderKey,
  DocSizeKey,
  DensityKey,
  EmbedModelKey,
  GenModelKey,
  Inputs,
  OverlapKey,
  ReindexKey,
  RerankerKey,
  SystemPromptKey,
  TopKKey,
  VectorDbKey,
} from '../lib/types';
import { formatNumber, getDeployment } from '../lib/costs';
import { RATES } from '../lib/rates';
import LogSlider from './LogSlider';
import RangeSlider from './RangeSlider';
import Select from './Select';

interface InputPanelProps {
  inputs: Inputs;
  onChange: (patch: Partial<Inputs>) => void;
}

// ---------------------------------------------------------------------------
// Static option tables (labels are pre-formatted per the spec).
// ---------------------------------------------------------------------------

const DOC_SIZE_OPTIONS: { value: DocSizeKey; label: string }[] = [
  { value: 'short', label: 'Short · 3 pages' },
  { value: 'standard', label: 'Standard · 10 pages' },
  { value: 'long', label: 'Long · 40 pages' },
  { value: 'report', label: 'Report · 120 pages' },
];

const DENSITY_OPTIONS: { value: DensityKey; label: string }[] = [
  { value: 'sparse', label: 'Sparse · 300 tok/page' },
  { value: 'standard', label: 'Standard · 500 tok/page' },
  { value: 'dense', label: 'Dense · 650 tok/page' },
];

const CHUNK_SIZE_OPTIONS: { value: ChunkSizeKey; label: string }[] = [
  { value: '256', label: '256 tokens' },
  { value: '512', label: '512 tokens' },
  { value: '1024', label: '1024 tokens' },
];

const OVERLAP_OPTIONS: { value: OverlapKey; label: string }[] = [
  { value: '0', label: '0% overlap' },
  { value: '0.10', label: '10% overlap' },
  { value: '0.25', label: '25% overlap' },
];

const TOPK_OPTIONS: { value: TopKKey; label: string }[] = [
  { value: '3', label: 'k = 3' },
  { value: '5', label: 'k = 5' },
  { value: '10', label: 'k = 10' },
  { value: '20', label: 'k = 20' },
];

const SYSTEM_PROMPT_OPTIONS: { value: SystemPromptKey; label: string }[] = [
  { value: '500', label: '500 tokens' },
  { value: '1500', label: '1,500 tokens' },
  { value: '3000', label: '3,000 tokens' },
];

const CACHE_OPTIONS: { value: CacheRateKey; label: string }[] = [
  { value: '0', label: '0% cache hit' },
  { value: '0.5', label: '50% cache hit' },
  { value: '0.75', label: '75% cache hit' },
  { value: '0.9', label: '90% cache hit' },
];

const REINDEX_OPTIONS: { value: ReindexKey; label: string }[] = [
  { value: '0', label: 'None' },
  { value: '0.08', label: 'Monthly · 8%' },
  { value: '0.30', label: 'Weekly · 30%' },
];

const RERANKER_OPTIONS: { value: RerankerKey; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'cohere', label: `Cohere rerank ($${RATES.rerankerPer1k.toFixed(2)} / 1k searches)` },
];

// ---------------------------------------------------------------------------
// Helpers — pull the spec-supplied labels so the dropdown is self-documenting.
// ---------------------------------------------------------------------------

function genModelLabel(key: GenModelKey): string {
  const m = RATES.genModels[key];
  const rate =
    'gpuStep' in m
      ? `GPU step $${m.gpuStep} / ${m.gpuCapacityReqTokens.toLocaleString('en-US')} req-tok`
      : `$${m.in}/1M in · $${m.out}/1M out`;
  return `${m.label} · ${rate}`;
}

function embedModelLabel(key: EmbedModelKey): string {
  const m = RATES.embedModels[key];
  return `${m.label} · $${m.perM}/1M tokens · ${m.dim}d`;
}

function vectorDbLabel(key: VectorDbKey): string {
  const d = RATES.vectorDbs[key];
  const tier = d.managed ? 'Managed' : 'Self-hosted';
  const base = 'base' in d ? `base $${d.base}/mo` : `$${d.nodeCost}/node`;
  return `${d.label} · ${tier} · ${base}`;
}

function cloudProviderLabel(key: CloudProviderKey): string {
  const e = RATES.egress[key];
  const free =
    e.freeGB === 0
      ? 'no free tier'
      : `${e.freeGB.toLocaleString('en-US')}GB free`;
  return `${e.label} · $${e.perGB}/GB egress · ${free}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Left-side shared input panel used by TabEstimate. Renders every input from
 * the spec, grouped into Corpus / Traffic / Models / Infra. The wrapping
 * white card is provided by the parent `TabEstimate`.
 */
export default function InputPanel({ inputs, onChange }: InputPanelProps) {
  const sessions = Math.ceil(
    inputs.requestsPerMonth / Math.max(1, inputs.avgSessionTurns),
  );
  const deployment = getDeployment(inputs);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          Inputs
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold text-ink">
          Shared assumptions
        </h2>
      </header>

      {/* ---------------- Corpus ---------------- */}
      <section className="flex flex-col gap-4">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          Corpus
        </h3>
        <LogSlider
          label="Documents"
          value={inputs.documents}
          min={1_000}
          max={2_000_000}
          format={formatNumber}
          onChange={(v) => onChange({ documents: v })}
        />
        <Select
          label="Avg document size"
          value={inputs.avgDocSizePages}
          options={DOC_SIZE_OPTIONS}
          onChange={(v) => onChange({ avgDocSizePages: v })}
        />
        <Select
          label="Tokens per page"
          value={inputs.tokensPerPage}
          options={DENSITY_OPTIONS}
          onChange={(v) => onChange({ tokensPerPage: v })}
        />
        <Select
          label="Chunk size"
          value={inputs.chunkSize}
          options={CHUNK_SIZE_OPTIONS}
          onChange={(v) => onChange({ chunkSize: v })}
        />
        <Select
          label="Chunk overlap"
          value={inputs.chunkOverlap}
          options={OVERLAP_OPTIONS}
          onChange={(v) => onChange({ chunkOverlap: v })}
        />
      </section>

      {/* ---------------- Traffic ---------------- */}
      <section className="flex flex-col gap-4">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          Traffic
        </h3>
        <LogSlider
          label="Requests / month"
          value={inputs.requestsPerMonth}
          min={1_000}
          max={10_000_000}
          format={formatNumber}
          onChange={(v) => onChange({ requestsPerMonth: v })}
        />
        <Select
          label="Top-K chunks retrieved"
          value={inputs.topK}
          options={TOPK_OPTIONS}
          onChange={(v) => onChange({ topK: v })}
        />
        <Select
          label="System prompt size"
          value={inputs.systemPromptTokens}
          options={SYSTEM_PROMPT_OPTIONS}
          onChange={(v) => onChange({ systemPromptTokens: v })}
        />
        <RangeSlider
          label="User query tokens"
          value={inputs.userQueryTokens}
          min={20}
          max={500}
          step={1}
          format={(n) => n.toLocaleString('en-US')}
          onChange={(v) => onChange({ userQueryTokens: v })}
        />
        <RangeSlider
          label="Output tokens"
          value={inputs.outputTokens}
          min={100}
          max={2_000}
          step={1}
          format={(n) => n.toLocaleString('en-US')}
          onChange={(v) => onChange({ outputTokens: v })}
        />
        <RangeSlider
          label="Avg session turns"
          value={inputs.avgSessionTurns}
          min={1}
          max={12}
          step={1}
          format={(n) => n.toString()}
          onChange={(v) => onChange({ avgSessionTurns: v })}
        />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-petrol">
            Sessions / month
          </span>
          <span className="font-mono text-sm font-medium tabular-nums text-ink">
            {sessions.toLocaleString('en-US')}
          </span>
        </div>
        <Select
          label="Prompt cache hit rate"
          value={inputs.cacheHitRate}
          options={CACHE_OPTIONS}
          onChange={(v) => onChange({ cacheHitRate: v })}
        />
      </section>

      {/* ---------------- Models ---------------- */}
      <section className="flex flex-col gap-4">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          Models
        </h3>
        <Select<GenModelKey>
          label="Generation model"
          value={inputs.genModel}
          options={(Object.keys(RATES.genModels) as GenModelKey[]).map((k) => ({
            value: k,
            label: genModelLabel(k),
          }))}
          onChange={(v) => onChange({ genModel: v })}
        />
        <Select<EmbedModelKey>
          label="Embedding model"
          value={inputs.embedModel}
          options={(Object.keys(RATES.embedModels) as EmbedModelKey[]).map(
            (k) => ({ value: k, label: embedModelLabel(k) }),
          )}
          onChange={(v) => onChange({ embedModel: v })}
        />
        <Select
          label="Reranker"
          value={inputs.reranker}
          options={RERANKER_OPTIONS}
          onChange={(v) => onChange({ reranker: v })}
        />
      </section>

      {/* ---------------- Infra ---------------- */}
      <section className="flex flex-col gap-4">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          Infra
        </h3>
        <Select<VectorDbKey>
          label="Vector database"
          value={inputs.vectorDb}
          options={(Object.keys(RATES.vectorDbs) as VectorDbKey[]).map((k) => ({
            value: k,
            label: vectorDbLabel(k),
          }))}
          onChange={(v) => onChange({ vectorDb: v })}
        />
        <Select<CloudProviderKey>
          label="Cloud provider"
          value={inputs.cloudProvider}
          options={(Object.keys(RATES.egress) as CloudProviderKey[]).map(
            (k) => ({ value: k, label: cloudProviderLabel(k) }),
          )}
          onChange={(v) => onChange({ cloudProvider: v })}
        />
        <label className="flex cursor-pointer items-center gap-2 font-body text-sm text-ink">
          <input
            type="checkbox"
            checked={inputs.crossRegion}
            onChange={(e) => onChange({ crossRegion: e.target.checked })}
            className="h-4 w-4 cursor-pointer rounded border-borders text-petrol accent-petrol focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg"
          />
          <span>Retrieved context crosses a network boundary</span>
        </label>
        <Select
          label="Reindex frequency"
          value={inputs.reindexFreq}
          options={REINDEX_OPTIONS}
          onChange={(v) => onChange({ reindexFreq: v })}
        />
        <RangeSlider
          label="Team size"
          value={inputs.teamSize}
          min={1}
          max={8}
          step={1}
          format={(n) =>
            `${n.toString()} engineer${n === 1 ? '' : 's'}`
          }
          onChange={(v) => onChange({ teamSize: v })}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-petrol">
            Deployment
          </span>
          <span className="inline-flex items-center rounded-full bg-tinted-surface px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-petrol">
            {deployment === 'managed' ? 'Managed' : 'Self-hosted'}
          </span>
        </div>
      </section>
    </div>
  );
}
