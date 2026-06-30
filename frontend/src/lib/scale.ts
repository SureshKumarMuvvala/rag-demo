// Scale-out analysis: sample monthly cost at log-spaced query volumes
// and find the crossover point where managed becomes more expensive than
// self-hosted (or vice versa).

import type { Inputs } from './types';
import { calculateCosts } from './costs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScalePoint {
  q: number;
  managed: number;
  selfhosted: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Log range used for sampling `requestsPerMonth`. */
const MIN_Q = 1_000;
const MAX_Q = 10_000_000;

/** Default number of sample points. */
const DEFAULT_SAMPLE_COUNT = 30;

/**
 * Sample the managed-vs-selfhosted cost curve at log-spaced query volumes.
 *
 * For each sample `q`:
 *   - managed    = calculateCosts({ ...inputs, genModel: 'gpt-5.4',
 *                                    vectorDb: 'pinecone',
 *                                    requestsPerMonth: q })
 *   - selfhosted = calculateCosts({ ...inputs, genModel: 'open-weight-gpu',
 *                                    vectorDb: 'selfhost',
 *                                    requestsPerMonth: q })
 *
 * Points are returned sorted by `q` ascending.
 */
export function generateScalePoints(
  inputs: Inputs,
  sampleCount: number = DEFAULT_SAMPLE_COUNT,
): ScalePoint[] {
  const n = Math.max(2, Math.floor(sampleCount));
  const logMin = Math.log10(MIN_Q);
  const logMax = Math.log10(MAX_Q);
  const step = (logMax - logMin) / (n - 1);

  const points: ScalePoint[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const q = Math.round(10 ** (logMin + i * step));
    const managed = calculateCosts({
      ...inputs,
      genModel: 'gpt-5.4',
      vectorDb: 'pinecone',
      requestsPerMonth: q,
    }).total;
    const selfhosted = calculateCosts({
      ...inputs,
      genModel: 'open-weight-gpu',
      vectorDb: 'selfhost',
      requestsPerMonth: q,
    }).total;
    points[i] = { q, managed, selfhosted };
  }
  return points;
}

/**
 * Find the crossover query volume where managed and self-hosted costs
 * are equal, by scanning consecutive sample points for a sign change
 * in `managed - selfhosted`. The crossover is interpolated on a log
 * scale between the bracketing points and returned as an integer
 * rounded to the nearest whole query.
 *
 * Returns `null` if the two lines do not cross within the sampled range
 * (including the case where one deployment is always cheaper).
 */
export function findBreakeven(points: ScalePoint[]): number | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const da = a.managed - a.selfhosted;
    const db = b.managed - b.selfhosted;

    // No exact hit at the endpoints of the bracket and no sign change:
    // skip.
    if (da === 0) return Math.round(a.q);
    if (da * db >= 0) continue;

    // Linear interpolation in log10(q) space. db / (db - da) is the
    // fraction of the log interval where the difference crosses zero.
    const t = -da / (db - da);
    const logQ = Math.log10(a.q) + t * (Math.log10(b.q) - Math.log10(a.q));
    return Math.round(10 ** logQ);
  }

  // Check the final point in case the difference lands exactly on zero.
  if (points.length > 0) {
    const last = points[points.length - 1];
    if (last.managed - last.selfhosted === 0) return Math.round(last.q);
  }

  return null;
}
