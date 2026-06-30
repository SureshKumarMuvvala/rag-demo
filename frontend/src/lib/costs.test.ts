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
    const baseInputs = {
      ...DEFAULT_INPUTS,
      genModel: 'open-weight-gpu' as const,
      cacheHitRate: '0' as const,
      userQueryTokens: 0,
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

  it('setup equals the un-amortized ingestion + embedding cost and is not in total', () => {
    const result = calculateCosts(DEFAULT_INPUTS);

    // setup should be amortMonths * the monthly embed bucket.
    expect(result.setup).toBeCloseTo(result.embed * RATES.amortMonths, 6);

    // total must equal the sum of the 8 buckets (no setup).
    const sumOfBuckets =
      result.inference +
      result.vector +
      result.embed +
      result.reindex +
      result.infra +
      result.obs +
      result.network +
      result.labor;
    expect(result.total).toBeCloseTo(sumOfBuckets, 6);

    // Including setup in the sum must overshoot total by exactly setup.
    expect(sumOfBuckets + result.setup - result.total).toBeCloseTo(result.setup, 6);

    // annual = total * 12, and does not include setup either.
    expect(result.annual).toBeCloseTo(result.total * 12, 6);
  });
});
