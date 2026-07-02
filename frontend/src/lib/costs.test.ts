import { describe, it, expect } from 'vitest';
import { calculateCosts } from './costs';
import { DEFAULT_INPUTS } from './types';
import { RATES } from './rates';

describe('calculateCosts', () => {
  it('cross-region toggle: network is 0 when off, > 0 when on (with sufficient volume)', () => {
    const off = calculateCosts({ ...DEFAULT_INPUTS, crossRegion: false });
    expect(off.network).toBe(0);

    // Use GCP (freeGB=1) with enough requests to exceed the 1 GB free tier.
    // Default retrieved = topK(5) * chunkSize(512) = 2560 tokens => 10240 bytes/req.
    // 200,000 reqs => ~2.048 GB => ~1.048 GB billable => positive network cost.
    const on = calculateCosts({
      ...DEFAULT_INPUTS,
      cloudProvider: 'gcp',
      crossRegion: true,
      requestsPerMonth: 200_000,
    });
    expect(on.network).toBeGreaterThan(0);
    expect(on.network).toBeGreaterThan(off.network);
  });

  it('changing embedding dimension changes both the embed and vector buckets', () => {
    // Use a hosted cluster DB so the vector bucket includes per-GB storage,
    // which depends on embedding dimension. (Pinecone serverless charges
    // per-Mvec, not per-GB, so it would be insensitive to dim.)
    const db: typeof DEFAULT_INPUTS.vectorDb = 'weaviate';
    const small = calculateCosts({ ...DEFAULT_INPUTS, embedModel: 'te3-small', vectorDb: db });
    const large = calculateCosts({ ...DEFAULT_INPUTS, embedModel: 'te3-large', vectorDb: db });

    // te3-large is more expensive per token AND has larger dim (3072 vs 1536).
    expect(small.embed).not.toBe(large.embed);
    expect(small.vector).not.toBe(large.vector);
    expect(large.embed).toBeGreaterThan(small.embed);
    expect(large.vector).toBeGreaterThan(small.vector);

    // Sanity-check the underlying dimensions.
    expect(RATES.embedModels['te3-small'].dim).toBe(1536);
    expect(RATES.embedModels['te3-large'].dim).toBe(3072);
  });

  it('higher cache hit rate reduces inference cost', () => {
    const low = calculateCosts({ ...DEFAULT_INPUTS, cacheHitRate: '0' });
    const high = calculateCosts({ ...DEFAULT_INPUTS, cacheHitRate: '0.9' });

    expect(high.inference).toBeLessThan(low.inference);
    expect(low.inference).toBeGreaterThan(0);
  });

  it('self-hosted GPU inference cost is step-wise (increases at capacity boundaries)', () => {
    // open-weight-gpu: gpuCapacityReqTokens = 1_300_000_000, gpuStep = $1080.
    // With cacheHitRate=0, userQueryTokens=0, systemPrompt=1500, topK=5,
    // chunkSize=512, outputTokens=500 => tokens/req = 1500 + 5*512 + 0 + 500 = 4560.
    // One-GPU capacity boundary = floor(1_300_000_000 / 4560) = 285_087 requests.
    // Two-GPU capacity boundary = floor(2 * 1_300_000_000 / 4560) = 570_175 requests.
    // Pin the token-driving inputs this test's arithmetic assumes, so it stays
    // independent of the default scenario's traffic settings.
    const baseInputs = {
      ...DEFAULT_INPUTS,
      genModel: 'open-weight-gpu' as const,
      cacheHitRate: '0' as const,
      userQueryTokens: 0,
      topK: '5' as const,
      chunkSize: '512' as const,
      systemPromptTokens: '1500' as const,
      outputTokens: 500,
      conversationHistoryTokens: 0,
      semanticCacheHitRate: 0,
    };

    // 285_087 reqs => 285_087 * 4560 = 1_299_996_720 tokens => ceil(.../1.3e9) = 1 step
    const oneStep = calculateCosts({ ...baseInputs, requestsPerMonth: 285_087 });
    expect(oneStep.inference).toBe(1080);

    // 285_088 reqs => 1_300_001_280 tokens => 2 steps => $2160
    const twoSteps = calculateCosts({ ...baseInputs, requestsPerMonth: 285_088 });
    expect(twoSteps.inference).toBe(2160);

    // Step count stays flat until the next boundary.
    // 570_175 reqs => 2_599_998_000 tokens => 2 steps
    const flatSteps = calculateCosts({ ...baseInputs, requestsPerMonth: 570_175 });
    expect(flatSteps.inference).toBe(2160);

    // 570_176 reqs => 2_600_002_560 tokens => 3 steps => $3240
    const threeSteps = calculateCosts({ ...baseInputs, requestsPerMonth: 570_176 });
    expect(threeSteps.inference).toBe(3240);
  });

  it('Cloudflare R2 egress is $0 even at non-zero volume', () => {
    const result = calculateCosts({
      ...DEFAULT_INPUTS,
      cloudProvider: 'r2',
      crossRegion: true,
      requestsPerMonth: 10_000_000,
    });
    expect(result.network).toBe(0);
    // Sanity-check the rate table assumption baked into the test.
    expect(RATES.egress.r2.perGB).toBe(0);
  });

  it('reranking is its own bucket and does not alter generation (inference)', () => {
    const none = calculateCosts({ ...DEFAULT_INPUTS, reranker: 'none' });
    const cohere = calculateCosts({ ...DEFAULT_INPUTS, reranker: 'cohere' });
    expect(none.reranking).toBe(0);
    expect(cohere.reranking).toBeCloseTo(
      (DEFAULT_INPUTS.requestsPerMonth / 1000) * RATES.rerankerPer1k,
      6,
    );
    // Generation cost is unaffected by the reranker choice.
    expect(cohere.inference).toBeCloseTo(none.inference, 6);
    // The reranking bucket flows into the total.
    expect(cohere.total).toBeGreaterThan(none.total + cohere.reranking - 1e-6);
  });

  it('cacheTTL "off" disables the hit-rate discount', () => {
    const off = calculateCosts({ ...DEFAULT_INPUTS, cacheTTL: 'off', cacheHitRate: '0.9' });
    const on = calculateCosts({ ...DEFAULT_INPUTS, cacheTTL: '5min', cacheHitRate: '0.9' });
    expect(off.inference).toBeGreaterThan(on.inference);
  });

  it('NAT / cross-AZ surcharges increase the network bucket', () => {
    const base = {
      ...DEFAULT_INPUTS,
      crossRegion: true,
      requestsPerMonth: 1_000_000,
      cloudProvider: 'gcp' as const,
    };
    const plain = calculateCosts(base);
    const nat = calculateCosts({ ...base, natSurcharge: true });
    const az = calculateCosts({ ...base, crossAz: true });
    expect(nat.network).toBeGreaterThan(plain.network);
    expect(az.network).toBeGreaterThan(plain.network);
  });

  it('custom overrides feed the cost model', () => {
    const base = calculateCosts(DEFAULT_INPUTS);

    // Generation rate override raises inference.
    const genO = calculateCosts(DEFAULT_INPUTS, {
      overrides: { genModel: { in: 100, out: 100 } },
    });
    expect(genO.inference).toBeGreaterThan(base.inference);

    // Vector flat-monthly override replaces the bucket directly.
    const vecO = calculateCosts(DEFAULT_INPUTS, {
      overrides: { vectorDb: { flatMonthly: 42 } },
    });
    expect(vecO.vector).toBe(42);

    // Cloud override changes the egress rate used for network.
    const cloudBase = calculateCosts({
      ...DEFAULT_INPUTS,
      crossRegion: true,
      requestsPerMonth: 1_000_000,
    });
    const cloudO = calculateCosts(
      { ...DEFAULT_INPUTS, crossRegion: true, requestsPerMonth: 1_000_000 },
      { overrides: { cloud: { perGB: 1, freeGB: 0 } } },
    );
    expect(cloudO.network).toBeGreaterThan(cloudBase.network);
  });

  it('a flat bucket pin replaces the computed bucket value', () => {
    const pinned = calculateCosts(DEFAULT_INPUTS, {
      overrides: { buckets: { labor: 1234 } },
    });
    expect(pinned.labor).toBe(1234);
  });

  it('misc line items flow into total (monthly) and setup (one-time)', () => {
    const base = calculateCosts(DEFAULT_INPUTS);
    const withMisc = calculateCosts(DEFAULT_INPUTS, {
      misc: [
        { id: 'a', label: 'CDN', amount: 500, cadence: 'monthly' },
        { id: 'b', label: 'Audit', amount: 9000, cadence: 'oneTime' },
      ],
    });
    expect(withMisc.miscMonthly).toBe(500);
    expect(withMisc.miscOneTime).toBe(9000);
    expect(withMisc.total).toBeCloseTo(base.total + 500, 6);
    expect(withMisc.setup).toBeCloseTo(base.setup + 9000, 6);
  });

  it('setup is the one-time ingestion + embedding cost and is not in total', () => {
    const result = calculateCosts(DEFAULT_INPUTS);

    // One-time corpus ingestion + embedding is a positive cost kept out of total.
    expect(result.setup).toBeGreaterThan(0);

    // total must equal the sum of the recurring buckets (no setup).
    const sumOfBuckets =
      result.inference +
      result.reranking +
      result.vector +
      result.embed +
      result.reindex +
      result.infra +
      result.network +
      result.labor +
      result.moderation;
    expect(result.total).toBeCloseTo(sumOfBuckets, 6);

    // Including setup in the sum must overshoot total by exactly setup.
    expect(sumOfBuckets + result.setup - result.total).toBeCloseTo(result.setup, 6);

    // annual = total * 12, and does not include setup either.
    expect(result.annual).toBeCloseTo(result.total * 12, 6);
  });
});
