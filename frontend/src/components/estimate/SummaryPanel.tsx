import { useState } from 'react';
import type { BucketKey, CostBreakdown, MiscItem, Overrides } from '../../lib/types';
import { formatCurrency } from '../../lib/costs';
import Waterline from '../Waterline';
import { CustomBadge } from './primitives';

interface BucketMeta {
  key: BucketKey;
  label: string;
  color: string;
  /** Which override key marks this bucket as rate-customized. */
  overrideKey?: keyof Overrides;
}

const BUCKETS: BucketMeta[] = [
  { key: 'inference', label: 'Inference', color: '#0E6E6E', overrideKey: 'genModel' },
  { key: 'reranking', label: 'Reranking', color: '#4C9AA0', overrideKey: 'reranker' },
  { key: 'vector', label: 'Vector DB', color: '#2DA0A0', overrideKey: 'vectorDb' },
  { key: 'embed', label: 'Embedding', color: '#C2790C', overrideKey: 'embedModel' },
  { key: 'reindex', label: 'Re-indexing', color: '#B5483A' },
  { key: 'infra', label: 'App & compute infra', color: '#2F7D5B' },
  { key: 'obs', label: 'Observability & evals', color: '#7CC79A' },
  { key: 'network', label: 'Network / data transfer', color: '#15242B', overrideKey: 'cloud' },
  { key: 'labor', label: 'Engineering labor', color: '#5A6B73' },
];

interface SummaryPanelProps {
  costs: CostBreakdown;
  overrides: Overrides;
  misc: MiscItem[];
  onPinBucket: (key: BucketKey, flat: number | null) => void;
}

export default function SummaryPanel({
  costs,
  overrides,
  misc,
  onPinBucket,
}: SummaryPanelProps) {
  const [editing, setEditing] = useState<BucketKey | null>(null);
  const [miscOpen, setMiscOpen] = useState(false);

  const total = costs.total;
  const belowPct =
    total > 0 ? round1(((total - costs.inference) / total) * 100) : 0;
  const largest = largestBucketLabel(costs);
  const pins = overrides.buckets ?? {};

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">Live estimate</p>
        <h2 className="mt-1 font-display text-lg font-semibold text-ink">Monthly cost</h2>
      </header>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-4xl font-semibold tabular-nums text-ink">
            {formatCurrency(total)}
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-ink/60">/ mo</span>
        </div>
        <div className="mt-1 font-mono text-xs uppercase tracking-wider text-ink/60">
          {formatCurrency(costs.annual)} / year
        </div>
        <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-ink/60">
          {formatCurrency(costs.setup)} one-time setup
        </div>
      </div>

      <ul className="flex flex-col" aria-label="Cost breakdown by category">
        {BUCKETS.map((b) => {
          const value = costs[b.key];
          const pct = total > 0 ? (value / total) * 100 : 0;
          const pinned = pins[b.key] != null;
          const rateCustom = b.overrideKey != null && overrides[b.overrideKey] != null;
          return (
            <li key={b.key} className="border-b border-borders/60 last:border-b-0">
              <div className="flex items-start gap-2.5 py-2">
                <span
                  aria-hidden="true"
                  className="mt-1 inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: b.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="font-body text-[13px] font-medium text-ink">{b.label}</span>
                      {(pinned || rateCustom) && <CustomBadge />}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[13px] tabular-nums text-ink">
                        {formatCurrency(value)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Pin ${b.label} to a flat monthly cost`}
                        onClick={() => setEditing(editing === b.key ? null : b.key)}
                        className="font-mono text-[11px] text-ink/40 hover:text-petrol focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
                      >
                        ✎
                      </button>
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] text-ink/45">
                      {pinned ? 'pinned flat $/mo' : ''}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-ink/45">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  {editing === b.key && (
                    <PinEditor
                      current={pins[b.key] ?? null}
                      onSet={(v) => {
                        onPinBucket(b.key, v);
                      }}
                      onClose={() => setEditing(null)}
                    />
                  )}
                </div>
              </div>
              {b.key === 'inference' && (
                <div className="pb-1.5">
                  <Waterline caption="most budgets stop here" />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Misc block */}
      <div className="rounded-xl border border-borders bg-tinted-surface/40 p-3">
        <button
          type="button"
          onClick={() => setMiscOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          <span className="font-body text-[13px] font-medium text-ink">
            Custom / miscellaneous
          </span>
          <span className="font-mono text-[13px] tabular-nums text-ink">
            {formatCurrency(costs.miscMonthly)}
            <span className="ml-1 text-ink/40">/mo</span>
          </span>
        </button>
        {costs.miscOneTime > 0 && (
          <p className="mt-1 font-mono text-[10px] text-ink/50">
            + {formatCurrency(costs.miscOneTime)} one-time (in setup)
          </p>
        )}
        {miscOpen && misc.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 border-t border-borders/60 pt-2">
            {misc.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-2">
                <span className="truncate font-body text-[12px] text-ink/75">
                  {m.label || '(unnamed)'}
                  <span className="ml-1 font-mono text-[9px] uppercase text-ink/40">
                    {m.cadence === 'monthly' ? 'mo' : 'once'}
                  </span>
                </span>
                <span className="font-mono text-[12px] tabular-nums text-ink/75">
                  {formatCurrency(m.amount || 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {miscOpen && misc.length === 0 && (
          <p className="mt-2 font-body text-[11px] text-ink/50">
            No custom lines yet — add them in “Team &amp; misc”.
          </p>
        )}
      </div>

      <p className="font-mono text-xs text-amber">
        {belowPct}% of cost is below the waterline; largest line is{' '}
        <span className="font-semibold">{largest}</span>
      </p>
    </div>
  );
}

function PinEditor({
  current,
  onSet,
  onClose,
}: {
  current: number | null;
  onSet: (v: number | null) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(current != null ? String(current) : '');
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-borders bg-surfaces p-2">
      <span className="font-mono text-[11px] text-ink/50">Flat $</span>
      <input
        type="number"
        inputMode="decimal"
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="—"
        className="w-24 bg-transparent font-mono text-[13px] tabular-nums text-ink focus:outline-none"
      />
      <button
        type="button"
        onClick={() => {
          const n = Number(val);
          onSet(val.trim() === '' || !Number.isFinite(n) ? null : n);
          onClose();
        }}
        className="rounded-md bg-petrol px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-petrol-light"
      >
        Pin
      </button>
      {current != null && (
        <button
          type="button"
          onClick={() => {
            onSet(null);
            onClose();
          }}
          className="font-mono text-[10px] uppercase tracking-wider text-ink/50 hover:text-alert"
        >
          unpin
        </button>
      )}
    </div>
  );
}

function round1(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function largestBucketLabel(costs: CostBreakdown): string {
  let topLabel = BUCKETS[0].label;
  let topVal = costs[BUCKETS[0].key];
  for (const b of BUCKETS) {
    if (costs[b.key] > topVal) {
      topLabel = b.label;
      topVal = costs[b.key];
    }
  }
  return topLabel;
}
