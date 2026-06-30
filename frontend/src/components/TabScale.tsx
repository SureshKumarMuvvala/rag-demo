import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CostBreakdown, Inputs } from '../lib/types';
import { calculateCosts, formatCurrency, formatNumber } from '../lib/costs';
import { findBreakeven, generateScalePoints } from '../lib/scale';
import LogSlider from './LogSlider';

interface TabScaleProps {
  inputs: Inputs;
  onQueryChange: (requestsPerMonth: number) => void;
}

const MIN_Q = 1_000;
const MAX_Q = 10_000_000;

type BucketKey = 'inference' | 'vector' | 'embed' | 'reindex' | 'infra' | 'obs' | 'labor';

const BUCKET_LABEL: Record<BucketKey, string> = {
  inference: 'Inference',
  vector: 'Vector DB',
  embed: 'Embedding',
  reindex: 'Reindex',
  infra: 'Infra',
  obs: 'Observability',
  labor: 'Labor',
};

function largestBucketLabel(c: CostBreakdown): string {
  let key: BucketKey = 'inference';
  let top = c.inference;
  (Object.keys(BUCKET_LABEL) as BucketKey[]).forEach((k) => {
    if (c[k] > top) {
      key = k;
      top = c[k];
    }
  });
  return BUCKET_LABEL[key];
}

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

/**
 * Tab 03 — plots managed vs. self-hosted total monthly cost across
 * the query range on a log-scale x axis. Marks the break-even with a
 * dashed amber vertical line and the user's current setting with
 * two colored dots (one on each line).
 */
export default function TabScale({ inputs, onQueryChange }: TabScaleProps) {
  const points = useMemo(
    () => generateScalePoints(inputs),
    [inputs],
  );
  const breakeven = useMemo(() => findBreakeven(points), [points]);

  const currentManaged = useMemo(
    () =>
      Math.round(
        calculateCosts({
          ...inputs,
          genModel: 'gpt-5.4',
          vectorDb: 'pinecone',
        }).total,
      ),
    [inputs],
  );
  const currentSelfhosted = useMemo(
    () =>
      Math.round(
        calculateCosts({
          ...inputs,
          genModel: 'open-weight-gpu',
          vectorDb: 'selfhost',
        }).total,
      ),
    [inputs],
  );

  const dominant = largestBucketLabel(calculateCosts(inputs));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">
          03 Scale &amp; Break-even
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold text-ink">
          Total cost vs. query volume
        </h2>
      </header>

      <div className="rounded-2xl border border-borders bg-surfaces p-6 shadow-card">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 24, right: 28, bottom: 16, left: 12 }}
            >
              <CartesianGrid stroke="#D9E0E3" strokeDasharray="2 4" />
              <XAxis
                dataKey="q"
                type="number"
                scale="log"
                domain={[MIN_Q, MAX_Q]}
                allowDataOverflow={false}
                tickFormatter={(v: number) => formatNumber(v)}
                stroke="#15242B"
                tick={{ fill: '#15242B', fontFamily: MONO, fontSize: 11 }}
                label={{
                  value: 'monthly queries',
                  position: 'insideBottom',
                  offset: -4,
                  fill: '#15242B',
                  fontFamily: MONO,
                  fontSize: 11,
                }}
              />
              <YAxis
                tickFormatter={(v: number) => formatCurrency(v)}
                stroke="#15242B"
                tick={{ fill: '#15242B', fontFamily: MONO, fontSize: 11 }}
                width={72}
                label={{
                  value: '$ / month',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#15242B',
                  fontFamily: MONO,
                  fontSize: 11,
                  offset: 12,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #D9E0E3',
                  borderRadius: 12,
                  fontFamily: MONO,
                  fontSize: 12,
                  color: '#15242B',
                }}
                formatter={(value: number, name) => [
                  formatCurrency(value),
                  name === 'managed' ? 'Managed' : 'Self-hosted',
                ]}
                labelFormatter={(q) => `${formatNumber(q as number)} queries/mo`}
              />

              <Line
                type="monotone"
                dataKey="managed"
                name="Managed"
                stroke="#0E6E6E"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="selfhosted"
                name="Self-hosted"
                stroke="#7CC79A"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
              />

              {breakeven !== null && (
                <ReferenceLine
                  x={breakeven}
                  stroke="#C2790C"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  label={{
                    value: `break-even ≈ ${formatNumber(breakeven)}/mo`,
                    position: 'top',
                    fill: '#C2790C',
                    fontFamily: MONO,
                    fontSize: 11,
                    offset: 4,
                  }}
                />
              )}

              <ReferenceDot
                x={inputs.requestsPerMonth}
                y={currentManaged}
                r={5}
                fill="#0E6E6E"
                stroke="#FFFFFF"
                strokeWidth={2}
                isFront
              />
              <ReferenceDot
                x={inputs.requestsPerMonth}
                y={currentSelfhosted}
                r={5}
                fill="#7CC79A"
                stroke="#FFFFFF"
                strokeWidth={2}
                isFront
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex items-center gap-4 font-mono text-[11px] text-ink/60">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-4 rounded"
              style={{ backgroundColor: '#0E6E6E' }}
            />
            Managed
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-4 rounded"
              style={{ backgroundColor: '#7CC79A' }}
            />
            Self-hosted
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4"
              style={{
                borderTop: '1.5px dashed #C2790C',
                background: 'transparent',
              }}
            />
            break-even
          </span>
        </div>

        <div className="mt-6">
          <LogSlider
            label="Monthly queries"
            value={inputs.requestsPerMonth}
            min={MIN_Q}
            max={MAX_Q}
            format={formatNumber}
            onChange={onQueryChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-borders bg-surfaces p-5 shadow-card">
          <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">
            Break-even
          </p>
          <p className="mt-2 font-display text-xl font-semibold text-ink">
            {breakeven !== null
              ? `≈ ${formatNumber(breakeven)} queries/mo`
              : 'No crossover in range'}
          </p>
          <p className="mt-1 font-body text-xs text-ink/60">
            Query volume at which Self-hosted becomes cheaper than Managed.
          </p>
        </div>
        <div className="rounded-2xl border border-borders bg-surfaces p-5 shadow-card">
          <p className="font-mono text-[11px] uppercase tracking-wider text-petrol">
            Dominant cost
          </p>
          <p className="mt-2 font-display text-xl font-semibold text-ink">
            {dominant}
          </p>
          <p className="mt-1 font-body text-xs text-ink/60">
            Largest bucket at your current scale.
          </p>
        </div>
      </div>
    </div>
  );
}
