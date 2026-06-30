import type { CostBreakdown, Inputs, VectorDbKey } from '../lib/types';
import {
  calculateCosts,
  formatCurrency,
  getDeployment,
} from '../lib/costs';
import {
  DOC_SIZE_PAGES,
  RATES,
  TOKENS_PER_PAGE,
} from '../lib/rates';
import InputPanel from './InputPanel';
import Waterline from './Waterline';
import Iceberg from './Iceberg';

interface TabEstimateProps {
  inputs: Inputs;
  onChange: (patch: Partial<Inputs>) => void;
}

// ---------------------------------------------------------------------------
// Bucket definitions. The order here drives both the rendered list and the
// "largest bucket" detection.
// ---------------------------------------------------------------------------

type BucketKey =
  | 'inference'
  | 'vector'
  | 'embed'
  | 'reindex'
  | 'infra'
  | 'obs'
  | 'network'
  | 'labor';

interface BucketMeta {
  key: BucketKey;
  label: string;
  color: string;
  /** Returns the "live formula" sub-label reflecting the current inputs. */
  formula: (inputs: Inputs) => string;
}

function vectorDbFormulaText(vdb: VectorDbKey): string {
  switch (vdb) {
    case 'pinecone': {
      const d = RATES.vectorDbs.pinecone;
      return `Pinecone · $${d.base} base + $${d.perGB}/GB + reads $${d.readsPerM}/M + writes $${d.writesPerM}/M`;
    }
    case 'weaviate': {
      const d = RATES.vectorDbs.weaviate;
      return `Weaviate · $${d.base} base + $${d.perMdim}/Mdim`;
    }
    case 'qdrant-cloud': {
      const d = RATES.vectorDbs['qdrant-cloud'];
      return `Qdrant Cloud · $${d.base} base + $${d.perGB}/GB`;
    }
    case 'pgvector-rds': {
      const d = RATES.vectorDbs['pgvector-rds'];
      return `pgvector RDS · $${d.base} base + $${d.perGB}/GB`;
    }
    case 'selfhost': {
      const d = RATES.vectorDbs.selfhost;
      return `Self-host · ceil(GB / ${d.nodeGBcap}) × $${d.nodeCost}/node`;
    }
  }
}

const BUCKETS: BucketMeta[] = [
  {
    key: 'inference',
    label: 'Inference',
    color: '#0E6E6E',
    formula: (inputs) => {
      const cachePct = Math.round(Number(inputs.cacheHitRate) * 100);
      return `sys ${inputs.systemPromptTokens} + ${inputs.topK}×${inputs.chunkSize} + ${inputs.userQueryTokens} tok/req · ${cachePct}% cached`;
    },
  },
  {
    key: 'vector',
    label: 'Vector DB',
    color: '#2DA0A0',
    formula: (inputs) => vectorDbFormulaText(inputs.vectorDb),
  },
  {
    key: 'embed',
    label: 'Embedding',
    color: '#C2790C',
    formula: (inputs) => {
      const pages = inputs.documents * DOC_SIZE_PAGES[inputs.avgDocSizePages];
      const tokensPerPageNum = TOKENS_PER_PAGE[inputs.tokensPerPage];
      const embedTokens = Math.round(
        pages * tokensPerPageNum * (1 + Number(inputs.chunkOverlap)),
      );
      const perM = RATES.embedModels[inputs.embedModel].perM;
      return `(${embedTokens.toLocaleString('en-US')} embed tok × $${perM}/1M + ${pages.toLocaleString('en-US')} pages × $${RATES.parsePerPage}) / ${RATES.amortMonths}`;
    },
  },
  {
    key: 'reindex',
    label: 'Re-indexing',
    color: '#B5483A',
    formula: (inputs) => {
      const pct = Math.round(Number(inputs.reindexFreq) * 100);
      return `${pct}% × (embed tok × $${RATES.embedModels[inputs.embedModel].perM}/1M + pages × $${RATES.parsePerPage})`;
    },
  },
  {
    key: 'infra',
    label: 'App & compute infra',
    color: '#2F7D5B',
    formula: (inputs) => {
      const reqsPerM = inputs.requestsPerMonth / 1_000_000;
      const reqsStr = reqsPerM >= 1 ? reqsPerM.toFixed(1) : reqsPerM.toFixed(2);
      return `$${RATES.infraBase} + ${reqsStr}M × $40`;
    },
  },
  {
    key: 'obs',
    label: 'Observability & evals',
    color: '#7CC79A',
    formula: () => `$${RATES.obsBase} + 5% × inference`,
  },
  {
    key: 'network',
    label: 'Network / data transfer',
    color: '#15242B',
    formula: (inputs) => {
      const retrieved = Number(inputs.topK) * Number(inputs.chunkSize);
      const outBytes = inputs.outputTokens * RATES.bytesPerToken;
      const crossBytes = inputs.crossRegion ? retrieved * RATES.bytesPerToken : 0;
      const totalEgressGB =
        (inputs.requestsPerMonth * (outBytes + crossBytes)) / 1e9;
      const e = RATES.egress[inputs.cloudProvider];
      return `${totalEgressGB.toFixed(2)} GB egress × $${e.perGB}/GB (free ${e.freeGB}GB) · ingress $0`;
    },
  },
  {
    key: 'labor',
    label: 'Engineering labor',
    color: '#5A6B73',
    formula: (inputs) => {
      const deployment = getDeployment(inputs);
      const maintFrac = RATES.maintFrac[deployment];
      return `${inputs.teamSize} engineers × $${RATES.laborMonthly} × ${maintFrac}`;
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Tab 01 — left: shared InputPanel. Right: monthly total, the 8 cost
 * buckets, an explicit ingress row, a waterline after inference, an amber
 * insight line, and the iceberg motif.
 */
export default function TabEstimate({ inputs, onChange }: TabEstimateProps) {
  const costs = calculateCosts(inputs);
  const total = costs.total;
  const hiddenPct =
    total > 0 ? round1(((total - costs.inference) / total) * 100) : 0;
  const largest = largestBucketLabel(costs);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="rounded-2xl border border-borders bg-surfaces p-6 shadow-card">
        <InputPanel inputs={inputs} onChange={onChange} />
      </div>

      <section className="rounded-2xl border border-borders bg-surfaces p-6 shadow-card">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">
            01 Estimate
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold text-ink">
            Monthly cost breakdown
          </h2>
        </header>

        <div className="mt-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-4xl font-semibold tabular-nums text-ink">
              {formatCurrency(total)}
            </span>
            <span className="font-mono text-sm uppercase tracking-wider text-ink/60">
              / month
            </span>
          </div>
          <div className="mt-1 font-mono text-xs uppercase tracking-wider text-ink/60">
            {formatCurrency(costs.annual)} / year
          </div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-ink/60">
            {formatCurrency(costs.setup)} one-time setup
          </div>
        </div>

        <ul className="mt-6 flex flex-col" aria-label="Cost breakdown by category">
          {BUCKETS.map((b) => {
            const value = costs[b.key];
            const pct = total > 0 ? (value / total) * 100 : 0;
            return (
              <li
                key={b.key}
                className="border-b border-borders/60 last:border-b-0"
              >
                <BucketRow
                  color={b.color}
                  label={b.label}
                  value={value}
                  pct={pct}
                  formula={b.formula(inputs)}
                />
                {b.key === 'inference' && (
                  <div className="pb-2">
                    <Waterline caption="most budgets stop here" />
                  </div>
                )}
                {b.key === 'network' && (
                  <div className="pb-2 pl-6">
                    <IngressRow />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-5 font-mono text-xs text-amber">
          {hiddenPct}% of cost is below the waterline; largest line is{' '}
          <span className="font-semibold">{largest}</span>
        </p>

        <div className="mt-4 flex justify-center">
          <Iceberg hiddenPercent={hiddenPct} />
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row primitives
// ---------------------------------------------------------------------------

function BucketRow({
  color,
  label,
  value,
  pct,
  formula,
}: {
  color: string;
  label: string;
  value: number;
  pct: number;
  formula: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span
        aria-hidden="true"
        className="mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-body text-sm font-medium text-ink">{label}</span>
          <span className="font-mono text-sm tabular-nums text-ink">
            {formatCurrency(value)}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[11px] text-ink/50">{formula}</span>
          <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-ink/50">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function IngressRow() {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span
        aria-hidden="true"
        className="mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-sm border border-dashed border-ink/40 bg-surfaces"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-body text-sm font-medium text-ink/70">
            Ingress — free on all providers
          </span>
          <span className="font-mono text-sm tabular-nums text-ink/70">
            {formatCurrency(0)}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[11px] text-ink/40">
            inbound traffic is $0 on AWS / Azure / GCP / Cloudflare R2 / Oracle
          </span>
          <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-ink/40">
            0.0%
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round1(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function largestBucketLabel(costs: CostBreakdown): string {
  let topLabel = BUCKETS[0].label;
  let topVal = costs[BUCKETS[0].key];
  for (const b of BUCKETS) {
    const v = costs[b.key];
    if (v > topVal) {
      topLabel = b.label;
      topVal = v;
    }
  }
  return topLabel;
}
