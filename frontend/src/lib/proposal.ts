// Shared proposal model. Builds one structured object from the SAME estimate
// state used by the Estimate tab, consumed identically by the on-screen preview,
// the PDF export, and the Excel export — so every surface shows the same numbers.

import type { BucketKey, CostBreakdown, Inputs, MiscItem, Overrides } from './types';
import { calculateCosts, formatNumber } from './costs';
import { RATES } from './rates';
import { CONTENT } from './exploreContent';
import { CONVERSION_STAMP, formatMoney } from './currency';
import type { Currency } from './currency';
import { aiToolsEdited, customModelName } from './labels';

/** Rate-snapshot label shown across the app and in exports. */
export const PRICES_AS_OF = 'June 2026';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface ProposalMeta {
  proposalTitle: string;
  preparedFor: string;
  preparedBy: string;
  date: string; // YYYY-MM-DD
  /** Display currency for all computed money on this proposal (from shared state). */
  displayCurrency: Currency;
  notes: string;
  includeBuildVsBuy: boolean;
  includeAssumptions: boolean;
  includeBreakdown: boolean;
  includeSources: boolean;
}

export function defaultProposalMeta(today: string): ProposalMeta {
  return {
    proposalTitle: 'RAG System — Total Cost of Ownership',
    preparedFor: '',
    preparedBy: '',
    date: today,
    displayCurrency: 'INR',
    notes: '',
    includeBuildVsBuy: true,
    includeAssumptions: true,
    includeBreakdown: true,
    includeSources: true,
  };
}

// ---------------------------------------------------------------------------
// Buckets (spec order + labels)
// ---------------------------------------------------------------------------

export const PROPOSAL_BUCKETS: { key: BucketKey; label: string }[] = [
  { key: 'inference', label: 'Inference' },
  { key: 'reranking', label: 'Reranking' },
  { key: 'vector', label: 'Vector storage & retrieval' },
  { key: 'embed', label: 'Ingestion & embedding' },
  { key: 'reindex', label: 'Re-indexing' },
  { key: 'infra', label: 'App & infra' },
  { key: 'obs', label: 'Observability' },
  { key: 'network', label: 'Network / egress' },
  { key: 'labor', label: 'Engineering labor' },
  { key: 'aiTools', label: 'AI / build tooling' },
];

/** Override key that marks each bucket's rate as hand-set (if any). */
const BUCKET_RATE_OVERRIDE: Partial<Record<BucketKey, keyof Overrides>> = {
  inference: 'genModel',
  reranking: 'reranker',
  vector: 'vectorDb',
  embed: 'embedModel',
  network: 'cloud',
};

function bucketIsCustom(key: BucketKey, overrides: Overrides): boolean {
  const pinned = overrides.buckets?.[key] != null;
  const rk = BUCKET_RATE_OVERRIDE[key];
  const rateCustom = rk ? overrides[rk] != null : false;
  return pinned || rateCustom;
}

// ---------------------------------------------------------------------------
// Model row types
// ---------------------------------------------------------------------------

export interface BreakdownRow {
  key: BucketKey;
  label: string;
  monthly: number;
  annual: number;
  pct: number;
  custom: boolean;
}

export interface MiscRow {
  label: string;
  monthly: number;
  oneTime: number;
}

export interface ConfigRow {
  label: string;
  value: string;
  custom: boolean;
}

export interface SourceRow {
  label: string;
  url: string;
}

export interface ProposalModel {
  meta: ProposalMeta;
  costs: CostBreakdown;
  breakdown: BreakdownRow[];
  misc: MiscRow[];
  belowWaterlinePct: number;
  execSummary: string;
  config: ConfigRow[];
  buildVsBuy: { managed: number; selfhosted: number } | null;
  sources: SourceRow[];
  caveat: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Formatting helpers (full-precision USD for tables)
// ---------------------------------------------------------------------------

/** Currency-aware money formatter used by the preview and exports. */
export function fmtMoney(n: number, currency: Currency): string {
  return formatMoney(n, currency);
}

export function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Config / assumptions rows
// ---------------------------------------------------------------------------

function genValue(inputs: Inputs, overrides: Overrides): string {
  const o = overrides.genModel;
  if (o) {
    const n = customModelName(o);
    if (o.gpuMonthly != null) return `${n} (custom) · $${o.gpuMonthly}/mo (flat)`;
    return `${n} (custom) · $${o.in ?? 0}/1M in · $${o.out ?? 0}/1M out`;
  }
  const m = RATES.genModels[inputs.genModel];
  const rate = 'gpuStep' in m ? 'self-host GPU' : `$${m.in}/1M in · $${m.out}/1M out`;
  return `${m.label} · ${rate}`;
}

function embedValue(inputs: Inputs, overrides: Overrides): string {
  const o = overrides.embedModel;
  if (o) return `${customModelName(o)} (custom) · $${o.perM}/1M · ${o.dim}d`;
  const m = RATES.embedModels[inputs.embedModel];
  return `${m.label} · $${m.perM}/1M · ${m.dim}d`;
}

function vectorValue(inputs: Inputs, overrides: Overrides): string {
  const o = overrides.vectorDb;
  if (o) {
    const n = customModelName(o);
    if (o.flatMonthly != null) return `${n} (custom) · $${o.flatMonthly}/mo (flat)`;
    return `${n} (custom) · base $${o.base ?? 0} + $${o.perGB ?? 0}/GB`;
  }
  return RATES.vectorDbs[inputs.vectorDb].label;
}

function rerankerValue(inputs: Inputs, overrides: Overrides): string {
  const o = overrides.reranker;
  if (o) {
    const n = customModelName(o);
    if (o.gpuMonthly != null) return `${n} (custom) · $${o.gpuMonthly}/mo (GPU)`;
    return `${n} (custom) · $${o.per1k}/1k searches`;
  }
  return inputs.reranker === 'none'
    ? 'None'
    : `Cohere rerank · $${RATES.rerankerPer1k.toFixed(2)}/1k searches`;
}

function cloudValue(inputs: Inputs, overrides: Overrides): string {
  const o = overrides.cloud;
  if (o) return `${customModelName(o)} (custom) · $${o.perGB}/GB · ${formatNumber(o.freeGB)}GB free`;
  const e = RATES.egress[inputs.cloudProvider];
  const free = e.freeGB ? `${formatNumber(e.freeGB)}GB free` : 'no free tier';
  return `${e.label} · $${e.perGB}/GB · ${free}`;
}

function docSizeValue(inputs: Inputs): string {
  if (inputs.avgDocSizePages === 'custom')
    return `${inputs.avgDocSizePagesCustom ?? 10} pages (custom)`;
  return { short: '3 pages', standard: '10 pages', long: '40 pages', report: '120 pages' }[
    inputs.avgDocSizePages
  ];
}

function tokensValue(inputs: Inputs): string {
  if (inputs.tokensPerPage === 'custom')
    return `${inputs.tokensPerPageCustom ?? 500} tok/page (custom)`;
  return { sparse: '300 tok/page', standard: '500 tok/page', dense: '650 tok/page' }[
    inputs.tokensPerPage
  ];
}

function cachingValue(inputs: Inputs): string {
  const ttl = { off: 'Off', '5min': '5-min TTL', '1hour': '1-hour TTL' }[inputs.cacheTTL];
  if (inputs.cacheTTL === 'off') return 'Off';
  return `${ttl} · ${Math.round(Number(inputs.cacheHitRate) * 100)}% hit`;
}

function aiToolsValue(inputs: Inputs, cur: Currency, aiToolsMonthly: number): string {
  if (aiToolsMonthly <= 0) return 'None';
  if (inputs.aiToolsMode === 'flat') return `Flat ${fmtMoney(aiToolsMonthly, cur)}/mo`;
  const n = Object.values(inputs.aiTools).filter(Boolean).length;
  return `${n} tool${n === 1 ? '' : 's'} · ${fmtMoney(aiToolsMonthly, cur)}/mo`;
}

function buildConfig(
  inputs: Inputs,
  overrides: Overrides,
  cur: Currency,
  aiToolsMonthly: number,
): ConfigRow[] {
  return [
    { label: 'Generation model', value: genValue(inputs, overrides), custom: overrides.genModel != null },
    { label: 'Embedding model', value: embedValue(inputs, overrides), custom: overrides.embedModel != null },
    { label: 'Vector database', value: vectorValue(inputs, overrides), custom: overrides.vectorDb != null },
    { label: 'Reranker', value: rerankerValue(inputs, overrides), custom: overrides.reranker != null },
    { label: 'Cloud / egress', value: cloudValue(inputs, overrides), custom: overrides.cloud != null },
    { label: 'Prompt caching', value: cachingValue(inputs), custom: false },
    { label: 'Documents', value: formatNumber(inputs.documents), custom: false },
    { label: 'Avg document size', value: docSizeValue(inputs), custom: inputs.avgDocSizePages === 'custom' },
    { label: 'Tokens / page', value: tokensValue(inputs), custom: inputs.tokensPerPage === 'custom' },
    {
      label: 'Chunk size / overlap',
      value: `${inputs.chunkSize} tok · ${Math.round(Number(inputs.chunkOverlap) * 100)}% overlap`,
      custom: false,
    },
    { label: 'Requests / month', value: formatNumber(inputs.requestsPerMonth), custom: false },
    { label: 'Top-K retrieved', value: `k = ${inputs.topK}`, custom: false },
    { label: 'Candidate pool', value: `${inputs.rerankCandidatePool} candidates`, custom: false },
    {
      label: 'Team size',
      value: `${inputs.teamSize} engineer${inputs.teamSize === 1 ? '' : 's'}`,
      custom: false,
    },
    {
      label: 'Loaded cost / engineer',
      value: `${fmtMoney(inputs.laborMonthly, cur)} / mo`,
      custom: inputs.laborMonthly !== 14_000,
    },
    {
      label: 'AI / build tooling',
      value: aiToolsValue(inputs, cur, aiToolsMonthly),
      custom: aiToolsEdited(inputs),
    },
  ];
}

// ---------------------------------------------------------------------------
// Sources (official pricing URLs from Explore CONTENT, deduped)
// ---------------------------------------------------------------------------

function buildSources(): SourceRow[] {
  const seen = new Set<string>();
  const out: SourceRow[] = [];
  for (const topic of CONTENT) {
    for (const l of topic.links) {
      if (seen.has(l.url)) continue;
      seen.add(l.url);
      out.push({ label: l.label, url: l.url });
    }
  }
  return out;
}

export const PROPOSAL_CAVEAT =
  'Provider prices change frequently; figures here are illustrative planning estimates, ' +
  'not quotes. Verify each rate against the official pricing pages before committing.';

// ---------------------------------------------------------------------------
// Build the full model
// ---------------------------------------------------------------------------

function isDefaultEstimate(overrides: Overrides, misc: MiscItem[]): boolean {
  const noOverrides = Object.keys(overrides).length === 0;
  return noOverrides && misc.length === 0;
}

export function buildProposalModel(
  inputs: Inputs,
  overrides: Overrides,
  misc: MiscItem[],
  meta: ProposalMeta,
): ProposalModel {
  const costs = calculateCosts(inputs, { overrides, misc });
  const total = costs.total || 1;

  const breakdown: BreakdownRow[] = PROPOSAL_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    monthly: costs[b.key],
    annual: costs[b.key] * 12,
    pct: (costs[b.key] / total) * 100,
    custom:
      b.key === 'aiTools'
        ? bucketIsCustom(b.key, overrides) || aiToolsEdited(inputs)
        : bucketIsCustom(b.key, overrides),
  }));

  const miscRows: MiscRow[] = misc.map((m) => ({
    label: m.label || '(unnamed)',
    monthly: m.cadence === 'monthly' ? m.amount || 0 : 0,
    oneTime: m.cadence === 'oneTime' ? m.amount || 0 : 0,
  }));

  const belowWaterlinePct =
    costs.total > 0 ? ((costs.total - costs.inference) / costs.total) * 100 : 0;

  const cur = meta.displayCurrency;
  const execSummary =
    `Estimated at ~${fmtMoney(costs.total, cur)}/mo (${fmtMoney(costs.annual, cur)}/yr) ` +
    `at ${formatNumber(inputs.requestsPerMonth)}/mo over ${formatNumber(inputs.documents)} docs.`;

  const managed = calculateCosts({ ...inputs, genModel: 'gpt-5.4', vectorDb: 'pinecone' });
  const selfhosted = calculateCosts({
    ...inputs,
    genModel: 'open-weight-gpu',
    vectorDb: 'selfhost',
  });

  return {
    meta,
    costs,
    breakdown,
    misc: miscRows,
    belowWaterlinePct,
    execSummary,
    config: buildConfig(inputs, overrides, meta.displayCurrency, costs.aiTools),
    buildVsBuy: { managed: managed.total, selfhosted: selfhosted.total },
    sources: buildSources(),
    caveat: PROPOSAL_CAVEAT,
    isDefault: isDefaultEstimate(overrides, misc),
  };
}

// ---------------------------------------------------------------------------
// Plain-text summary (for "Copy summary")
// ---------------------------------------------------------------------------

export function proposalPlainText(model: ProposalModel): string {
  const { meta, costs, breakdown, misc } = model;
  const cur = meta.displayCurrency;
  const money = (n: number) => fmtMoney(n, cur);
  const lines: string[] = [];
  lines.push(meta.proposalTitle);
  if (meta.preparedFor) lines.push(`Prepared for: ${meta.preparedFor}`);
  if (meta.preparedBy) lines.push(`Prepared by: ${meta.preparedBy}`);
  lines.push(`Date: ${meta.date} · Prices as of ${PRICES_AS_OF} (illustrative)`);
  if (cur === 'INR') lines.push(CONVERSION_STAMP);
  lines.push('');
  lines.push(model.execSummary);
  lines.push(
    `Monthly: ${money(costs.total)}  |  Annual: ${money(costs.annual)}  |  One-time setup: ${money(costs.setup)}`,
  );
  lines.push('');
  lines.push(`COST BREAKDOWN (per month · ${cur})`);
  for (const r of breakdown) {
    const tag = r.custom ? ' [custom]' : '';
    lines.push(`  ${r.label.padEnd(30)} ${money(r.monthly).padStart(12)}  ${fmtPct(r.pct).padStart(6)}${tag}`);
  }
  for (const m of misc) {
    const amt = m.monthly || m.oneTime;
    const cad = m.oneTime ? 'one-time' : '/mo';
    lines.push(`  ${('misc: ' + m.label).padEnd(30)} ${money(amt).padStart(12)}  ${cad}`);
  }
  lines.push('');
  lines.push(
    `${model.belowWaterlinePct.toFixed(0)}% of monthly cost sits below the inference "waterline".`,
  );
  return lines.join('\n');
}
