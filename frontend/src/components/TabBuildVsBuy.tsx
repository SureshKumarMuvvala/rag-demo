import type { CostBreakdown, Inputs } from '../lib/types';
import { calculateCosts } from '../lib/costs';
import { useMoney } from '../lib/currency';

interface TabBuildVsBuyProps {
  inputs: Inputs;
}

// ---------------------------------------------------------------------------
// Bucket definitions. Order matches the 8-bucket cost model and drives both
// the rendered list inside each scenario card.
// ---------------------------------------------------------------------------

type BucketKey =
  | 'inference'
  | 'reranking'
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
}

const BUCKETS: BucketMeta[] = [
  { key: 'inference', label: 'Inference' },
  { key: 'reranking', label: 'Reranking' },
  { key: 'vector', label: 'Vector DB' },
  { key: 'embed', label: 'Embedding' },
  { key: 'reindex', label: 'Re-indexing' },
  { key: 'infra', label: 'Infra' },
  { key: 'obs', label: 'Observability' },
  { key: 'network', label: 'Network' },
  { key: 'labor', label: 'Labor' },
];

type ScenarioKey = 'managed' | 'selfhosted';

interface ScenarioMeta {
  key: ScenarioKey;
  letter: string;
  title: string;
  subtitle: string;
}

const SCENARIOS: ScenarioMeta[] = [
  {
    key: 'managed',
    letter: 'A',
    title: 'Managed',
    subtitle: 'Hosted gen model + managed vector DB',
  },
  {
    key: 'selfhosted',
    letter: 'B',
    title: 'Self-hosted',
    subtitle: 'Open-weight GPU + self-hosted vector DB',
  },
];

/**
 * Tab 02 — Build vs. Buy.
 *
 * Computes two scenarios from the same shared inputs:
 *   - Managed:     genModel = 'gpt-5.4',     vectorDb = 'pinecone'
 *   - Self-hosted: genModel = 'open-weight-gpu', vectorDb = 'selfhost'
 *
 * The cheaper scenario is highlighted with a green border and a "cheaper"
 * badge; a dark verdict bar below the cards names the winner, gives a
 * one-sentence reason, and shows the annualised delta.
 */
export default function TabBuildVsBuy({ inputs }: TabBuildVsBuyProps) {
  const formatCurrency = useMoney();
  const managed = calculateCosts({
    ...inputs,
    genModel: 'gpt-5.4',
    vectorDb: 'pinecone',
  });
  const selfhosted = calculateCosts({
    ...inputs,
    genModel: 'open-weight-gpu',
    vectorDb: 'selfhost',
  });

  const managedWins = managed.total <= selfhosted.total;
  const monthlyDelta = Math.abs(managed.total - selfhosted.total);
  const annualDelta = monthlyDelta * 12;

  const winnerKey: ScenarioKey = managedWins ? 'managed' : 'selfhosted';
  const winnerTitle = managedWins ? 'Managed wins' : 'Self-hosted wins';
  const reason = managedWins
    ? 'Managed API inference is cheaper at this query volume; the self-hosted GPU step has not yet amortised.'
    : 'Self-hosted GPU costs flatten as volume grows; managed API inference scales linearly above this threshold.';

  const cards: Record<ScenarioKey, CostBreakdown> = { managed, selfhosted };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          02 Build vs. Buy
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold text-ink">
          Two scenarios, same documents &amp; queries
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {SCENARIOS.map((s) => (
          <ScenarioCard
            key={s.key}
            meta={s}
            costs={cards[s.key]}
            cheaper={s.key === winnerKey}
          />
        ))}
      </div>

      <div className="rounded-2xl bg-ink px-6 py-5 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-white/60">
              Verdict
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold text-white">
              {winnerTitle}
            </h3>
            <p className="mt-1 max-w-2xl font-body text-sm text-white/70">
              {reason}
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 md:items-end">
            <span className="font-mono text-[11px] uppercase tracking-wider text-white/60">
              Annual delta
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums text-value-green">
              {formatCurrency(annualDelta)} / year
            </span>
            <span className="font-mono text-[11px] text-white/50">
              {formatCurrency(monthlyDelta)} / month difference
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario card
// ---------------------------------------------------------------------------

function ScenarioCard({
  meta,
  costs,
  cheaper,
}: {
  meta: ScenarioMeta;
  costs: CostBreakdown;
  cheaper: boolean;
}) {
  const formatCurrency = useMoney();
  return (
    <div
      className={[
        'rounded-2xl border bg-surfaces p-6 shadow-card',
        cheaper ? 'border-value-green' : 'border-borders',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          {meta.letter} · {meta.title}
        </p>
        {cheaper && (
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-value-green"
            style={{ backgroundColor: 'rgba(47, 125, 91, 0.12)' }}
          >
            cheaper
          </span>
        )}
      </div>
      <p className="mt-1 font-body text-sm text-ink/70">{meta.subtitle}</p>

      <ul className="mt-4 flex flex-col">
        {BUCKETS.map((b) => (
          <li
            key={b.key}
            className="flex items-center justify-between border-b border-borders/50 py-2 last:border-b-0"
          >
            <span className="font-body text-sm text-ink">{b.label}</span>
            <span className="font-mono text-sm tabular-nums text-ink">
              {formatCurrency(costs[b.key])}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between border-t border-borders pt-4">
        <span className="font-display text-sm font-semibold text-ink">
          Total / month
        </span>
        <span
          className={[
            'font-mono text-xl font-semibold tabular-nums',
            cheaper ? 'text-value-green' : 'text-ink',
          ].join(' ')}
        >
          {formatCurrency(costs.total)}
        </span>
      </div>
    </div>
  );
}
