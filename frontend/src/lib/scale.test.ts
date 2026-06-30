import { describe, it, expect } from 'vitest';
import { generateScalePoints, findBreakeven } from './scale';
import { DEFAULT_INPUTS } from './types';
import { calculateCosts } from './costs';

describe('generateScalePoints', () => {
  it('returns 30 points by default, sorted by q ascending', () => {
    const points = generateScalePoints(DEFAULT_INPUTS);
    expect(points).toHaveLength(30);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].q).toBeGreaterThan(points[i - 1].q);
    }
  });

  it('honors a custom sampleCount', () => {
    const points = generateScalePoints(DEFAULT_INPUTS, 10);
    expect(points).toHaveLength(10);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].q).toBeGreaterThan(points[i - 1].q);
    }
  });

  it('spans the configured log range (1k to 10M) at the endpoints', () => {
    const points = generateScalePoints(DEFAULT_INPUTS);
    expect(points[0].q).toBe(1_000);
    expect(points[points.length - 1].q).toBe(10_000_000);
  });

  it('first and last q are powers of 10 (log spacing)', () => {
    const points = generateScalePoints(DEFAULT_INPUTS, 5);
    const qs = points.map((p) => p.q);
    expect(qs).toEqual([1_000, 10_000, 100_000, 1_000_000, 10_000_000]);
  });

  it('matches calculateCosts at a sampled power-of-10 q', () => {
    // sampleCount=5 produces exactly [1k, 10k, 100k, 1M, 10M] as powers of 10.
    const q = 100_000;
    const points = generateScalePoints(DEFAULT_INPUTS, 5);
    const managedPoint = points.find((p) => p.q === q);
    expect(managedPoint).toBeDefined();

    const expectedManaged = calculateCosts({
      ...DEFAULT_INPUTS,
      genModel: 'gpt-5.4',
      vectorDb: 'pinecone',
      requestsPerMonth: q,
    }).total;
    const expectedSelfhosted = calculateCosts({
      ...DEFAULT_INPUTS,
      genModel: 'open-weight-gpu',
      vectorDb: 'selfhost',
      requestsPerMonth: q,
    }).total;

    expect(managedPoint!.managed).toBeCloseTo(expectedManaged, 6);
    expect(managedPoint!.selfhosted).toBeCloseTo(expectedSelfhosted, 6);
  });

  it('both managed and selfhosted totals are positive', () => {
    const points = generateScalePoints(DEFAULT_INPUTS);
    for (const p of points) {
      expect(p.managed).toBeGreaterThan(0);
      expect(p.selfhosted).toBeGreaterThan(0);
    }
  });

  it('costs are monotonically non-decreasing with q', () => {
    const points = generateScalePoints(DEFAULT_INPUTS);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].managed).toBeGreaterThanOrEqual(points[i - 1].managed);
      expect(points[i].selfhosted).toBeGreaterThanOrEqual(
        points[i - 1].selfhosted
      );
    }
  });
});

describe('findBreakeven', () => {
  it('returns null when one line is always cheaper', () => {
    // Construct monotonic points where managed is always cheaper.
    const points = [
      { q: 1_000, managed: 100, selfhosted: 200 },
      { q: 10_000, managed: 110, selfhosted: 220 },
      { q: 100_000, managed: 120, selfhosted: 240 },
      { q: 1_000_000, managed: 130, selfhosted: 260 },
    ];
    expect(findBreakeven(points)).toBeNull();
  });

  it('returns the q at which managed == selfhosted (exact hit)', () => {
    const points = [
      { q: 1_000, managed: 100, selfhosted: 50 },
      { q: 10_000, managed: 100, selfhosted: 100 },
      { q: 100_000, managed: 200, selfhosted: 150 },
    ];
    expect(findBreakeven(points)).toBe(10_000);
  });

  it('interpolates on a log scale between bracketing points', () => {
    // At q=1000: managed-selfhosted = -150 (managed cheaper).
    // At q=10000: managed-selfhosted = +150 (selfhosted cheaper).
    // Sign change: t = -da / (db - da) = 150 / 300 = 0.5.
    // log10(q*) = 3 + 0.5 * 1 = 3.5 => q* = 10^3.5 = 3162.28 -> 3162.
    const points = [
      { q: 1_000, managed: 50, selfhosted: 200 },
      { q: 10_000, managed: 250, selfhosted: 100 },
    ];
    expect(findBreakeven(points)).toBe(3162);
  });

  it('interpolates correctly when the bracket is asymmetric', () => {
    // At q=1000: da = -100. At q=100000: db = +300.
    // t = 100 / 400 = 0.25. log10(q*) = 3 + 0.25 * 2 = 3.5.
    // q* = 10^3.5 = 3162.
    const points = [
      { q: 1_000, managed: 50, selfhosted: 150 },
      { q: 100_000, managed: 400, selfhosted: 100 },
    ];
    expect(findBreakeven(points)).toBe(3162);
  });

  it('finds a break-even within the 1k–10M range for DEFAULT_INPUTS', () => {
    // With the spec rates the managed and self-hosted lines do cross inside
    // the sampled range. Verify findBreakeven returns a non-null crossover
    // somewhere between MIN_Q (1_000) and MAX_Q (10_000_000).
    const points = generateScalePoints(DEFAULT_INPUTS);
    const be = findBreakeven(points);
    expect(be).not.toBeNull();
    expect(be!).toBeGreaterThanOrEqual(1_000);
    expect(be!).toBeLessThanOrEqual(10_000_000);
  });

  it('returns null for an empty array', () => {
    expect(findBreakeven([])).toBeNull();
  });

  it('returns null for a single point with non-zero difference', () => {
    const points = [{ q: 1_000, managed: 100, selfhosted: 200 }];
    expect(findBreakeven(points)).toBeNull();
  });

  it('returns q when a single point has zero difference', () => {
    const points = [{ q: 1_000, managed: 100, selfhosted: 100 }];
    expect(findBreakeven(points)).toBe(1_000);
  });

  it('finds a crossover when one is constructed explicitly', () => {
    // Cross from managed-cheap to selfhosted-cheap between q=10_000 and q=100_000.
    const points = [
      { q: 1_000, managed: 50, selfhosted: 100 },
      { q: 10_000, managed: 80, selfhosted: 90 },
      { q: 100_000, managed: 200, selfhosted: 50 },
    ];
    const q = findBreakeven(points);
    expect(q).not.toBeNull();
    // Crossover should be between 10_000 and 100_000.
    expect(q!).toBeGreaterThan(10_000);
    expect(q!).toBeLessThan(100_000);
  });
});
