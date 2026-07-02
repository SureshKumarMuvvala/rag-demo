// Pure, synchronous cost-model implementation.
// All formulas come from the RAG TCO Estimator spec.

import type {
  BucketKey,
  CostBreakdown,
  DeploymentKey,
  EstimateExtras,
  Inputs,
} from './types';
import {
  DOC_SIZE_PAGES,
  RATES,
  TOKENS_PER_PAGE,
} from './rates';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive the deployment classification from the chosen vector DB.
 * Managed vector DBs (Pinecone, Weaviate, Qdrant Cloud, pgvector RDS)
 * are 'managed'; everything else is 'selfhosted'.
 */
export function getDeployment(inputs: Pick<Inputs, 'vectorDb'>): DeploymentKey {
  return RATES.vectorDbs[inputs.vectorDb].managed ? 'managed' : 'selfhosted';
}

/**
 * Compute the monthly cost breakdown for a given set of inputs.
 *
 * Bucket order (matches the spec and `CostBreakdown`):
 *   1. inference - LLM generation (API tokens) or open-weight GPU step cost
 *                  + reranker (per 1k searches)
 *   2. vector    - Vector DB hosting (per-DB branch from the spec)
 *   3. embed     - One-time embedding + parse, amortized over `amortMonths`
 *   4. reindex   - Monthly re-embedding of the `reindexFreq` fraction
 *   5. infra     - Flat monthly infra (monitoring/servers/storage)
 *   6. network   - Egress bytes (outputTokens always; retrieved if crossRegion)
 *                  with provider free tier
 *   7. labor     - teamSize * laborMonthly * maintFrac
 *   8. moderation- optional per-token safety pass
 *
 * `total` = sum of the buckets. `annual` = `total * 12`.
 * `setup` = full (un-amortized) ingestion + embedding cost; not in `total`.
 */
export function calculateCosts(
  inputs: Inputs,
  extras?: EstimateExtras,
): CostBreakdown {
  const {
    documents,
    avgDocSizePages,
    avgDocSizePagesCustom,
    tokensPerPage,
    tokensPerPageCustom,
    chunkSize,
    chunkOverlap,
    requestsPerMonth,
    topK,
    rerankCandidatePool,
    systemPromptTokens,
    systemPromptTokensCustom,
    userQueryTokens,
    outputTokens,
    cacheTTL,
    cacheHitRate,
    genModel,
    embedModel,
    reranker,
    vectorDb,
    cloudProvider,
    crossRegion,
    natSurcharge,
    crossAz,
    reindexFreq,
    teamSize,
    laborMonthly,
    maintFrac,
    conversationHistoryTokens,
    semanticCacheHitRate,
    dupChunkPct,
    newDocsPerMonth,
    ocrPct,
    ocrPerPage,
    parserPerPage,
    tablesPerDoc,
    tableExtractPer,
    imagesPerDoc,
    imageExtractPer,
    moderationEnabled,
    moderationPerM,
    infraMonthly,
  } = inputs;

  const overrides = extras?.overrides ?? {};
  const misc = extras?.misc ?? [];

  // ------------------------------------------------------------------
  // Numeric conversions for the union-typed inputs.
  // ------------------------------------------------------------------
  const pagesPerDoc =
    avgDocSizePages === 'custom'
      ? Math.max(0, avgDocSizePagesCustom ?? DOC_SIZE_PAGES.standard)
      : DOC_SIZE_PAGES[avgDocSizePages];
  const pages = documents * pagesPerDoc;
  const tokensPerPageNum =
    tokensPerPage === 'custom'
      ? Math.max(0, tokensPerPageCustom ?? TOKENS_PER_PAGE.standard)
      : TOKENS_PER_PAGE[tokensPerPage];
  const chunkSizeNum = Number(chunkSize);
  const chunkOverlapNum = Number(chunkOverlap);
  const topKNum = Number(topK);
  const poolNum = Number(rerankCandidatePool);
  const systemPromptNum =
    systemPromptTokens === 'custom'
      ? Math.max(0, systemPromptTokensCustom ?? 1500)
      : Number(systemPromptTokens);
  const cacheHitRateNum = Number(cacheHitRate);
  const reindexFreqNum = Number(reindexFreq);

  // A reranker (preset or custom) narrows a wider candidate pool to top-K.
  const rerankActive = reranker !== 'none' || overrides.reranker != null;

  // ------------------------------------------------------------------
  // Corpus / embedding derivations shared by multiple buckets.
  // Embedding rate + dimension honor a custom override when present.
  // ------------------------------------------------------------------
  const dupChunkFrac = clamp01(dupChunkPct);
  const rawTokens = pages * tokensPerPageNum;
  const embedTokens = rawTokens * (1 + chunkOverlapNum);
  // Duplicate chunks are de-duplicated before storage, reducing stored vectors.
  const vectors = (embedTokens / chunkSizeNum) * (1 - dupChunkFrac);
  const dim = overrides.embedModel?.dim ?? RATES.embedModels[embedModel].dim;
  const storageGB =
    (vectors * dim * RATES.bytesPerToken * RATES.hnswOverhead) / 1e9;

  const retrieved = topKNum * chunkSizeNum;
  const reqs = requestsPerMonth;
  const embedPerM = overrides.embedModel?.perM ?? RATES.embedModels[embedModel].perM;

  // Reads fetch the wider candidate pool when reranking, else just top-K.
  const readsPerReq = rerankActive ? poolNum : topKNum;

  // ------------------------------------------------------------------
  // 1. inference (generation only; reranking is its own bucket)
  //    inTok = systemPromptTokens + retrieved + userQueryTokens
  //    Caching (unless TTL 'off') discounts the cacheable prefix on hits and
  //    adds a write surcharge on misses scaled by the TTL multiplier.
  // ------------------------------------------------------------------
  const gen = RATES.genModels[genModel];
  const genOverride = overrides.genModel;
  const baseInputTokens =
    systemPromptNum +
    retrieved +
    userQueryTokens +
    Math.max(0, conversationHistoryTokens || 0);

  const cachingOn = cacheTTL !== 'off';
  const cachedFraction = cachingOn
    ? cacheHitRateNum * RATES.cacheableFractionOfInput
    : 0;
  const effectiveInputTokens = baseInputTokens * (1 - cachedFraction);

  // Per-request cache-write surcharge (API models only): the cacheable prefix
  // is (re)written on the miss fraction, billed at (mult - 1) x the input rate.
  const ttlMult = RATES.cacheWriteMult[cacheTTL];
  const cacheablePrefix = baseInputTokens * RATES.cacheableFractionOfInput;
  const writeSurchargeTokens = cachingOn
    ? cacheablePrefix * (1 - cacheHitRateNum) * Math.max(0, ttlMult - 1)
    : 0;

  // A semantic-cache hit returns a cached answer, skipping generation entirely.
  const genQueryFrac = 1 - clamp01(semanticCacheHitRate);
  const genReqs = reqs * genQueryFrac;

  let genCost: number;
  if (genOverride?.gpuMonthly != null) {
    // Custom self-host style generation: flat monthly (fixed regardless of volume).
    genCost = genOverride.gpuMonthly;
  } else if (genOverride && (genOverride.in != null || genOverride.out != null)) {
    // Custom API rates.
    const inRate = genOverride.in ?? 0;
    const outRate = genOverride.out ?? 0;
    genCost =
      genReqs *
      (((effectiveInputTokens + writeSurchargeTokens) / 1_000_000) * inRate +
        (outputTokens / 1_000_000) * outRate);
  } else if ('gpuStep' in gen) {
    // Open-weight: total request-tokens (in + out) drives GPU step count.
    const totalReqTokens = genReqs * (effectiveInputTokens + outputTokens);
    genCost = Math.ceil(totalReqTokens / gen.gpuCapacityReqTokens) * gen.gpuStep;
  } else {
    genCost =
      genReqs *
      (((effectiveInputTokens + writeSurchargeTokens) / 1_000_000) * gen.in +
        (outputTokens / 1_000_000) * gen.out);
  }
  const inference = genCost;

  // ------------------------------------------------------------------
  // 1b. reranking (per-1k searches, or custom per1k / flat GPU monthly)
  // ------------------------------------------------------------------
  let reranking: number;
  if (overrides.reranker?.gpuMonthly != null) {
    reranking = overrides.reranker.gpuMonthly;
  } else if (overrides.reranker?.per1k != null) {
    reranking = (reqs / 1000) * overrides.reranker.per1k;
  } else if (reranker !== 'none') {
    reranking = (reqs / 1000) * RATES.rerankerPer1k;
  } else {
    reranking = 0;
  }

  // ------------------------------------------------------------------
  // 2. vector (custom override, else branch on DB per spec)
  // ------------------------------------------------------------------
  let vector: number;
  const vdbOverride = overrides.vectorDb;
  if (vdbOverride?.flatMonthly != null) {
    vector = vdbOverride.flatMonthly;
  } else if (vdbOverride) {
    // Advanced custom: Pinecone-style base + storage + reads + writes.
    vector =
      (vdbOverride.base ?? 0) +
      storageGB * (vdbOverride.perGB ?? 0) +
      ((reqs * readsPerReq) / 1_000_000) * (vdbOverride.readsPerM ?? 0) +
      (vectors / 1_000_000) * (vdbOverride.writesPerM ?? 0);
  } else {
    switch (vectorDb) {
      case 'pinecone':
        vector =
          RATES.vectorDbs.pinecone.base +
          storageGB * RATES.vectorDbs.pinecone.perGB +
          ((reqs * readsPerReq) / 1_000_000) * RATES.vectorDbs.pinecone.readsPerM +
          (vectors / 1_000_000) * RATES.vectorDbs.pinecone.writesPerM;
        break;
      case 'weaviate':
        vector =
          RATES.vectorDbs.weaviate.base +
          ((vectors * dim) / 1_000_000) * RATES.vectorDbs.weaviate.perMdim;
        break;
      case 'qdrant-cloud':
        vector =
          RATES.vectorDbs['qdrant-cloud'].base +
          storageGB * RATES.vectorDbs['qdrant-cloud'].perGB;
        break;
      case 'pgvector-rds':
        vector =
          RATES.vectorDbs['pgvector-rds'].base +
          storageGB * RATES.vectorDbs['pgvector-rds'].perGB;
        break;
      case 'selfhost': {
        const d = RATES.vectorDbs.selfhost;
        vector = Math.ceil(storageGB / d.nodeGBcap) * d.nodeCost;
        break;
      }
    }
  }

  // ------------------------------------------------------------------
  // 3. embed / ingestion (one-time, amortized monthly) + setup (full one-time)
  //    Per-doc = embedding tokens + ingestion detail (OCR, parser, tables,
  //    images). embedOneTime scales that over the base corpus.
  // ------------------------------------------------------------------
  const tokensPerDoc = pagesPerDoc * tokensPerPageNum * (1 + chunkOverlapNum);
  const embedCostPerDoc = (tokensPerDoc / 1_000_000) * embedPerM;
  // OCR'd pages are text-extracted by OCR; only the remaining pages hit the
  // parser (matches the Excel, which parses non-OCR pages only).
  const ocrFrac = clamp01(ocrPct);
  const ingestPerDoc =
    pagesPerDoc * ocrFrac * Math.max(0, ocrPerPage || 0) +
    pagesPerDoc * (1 - ocrFrac) * Math.max(0, parserPerPage || 0) +
    Math.max(0, tablesPerDoc || 0) * Math.max(0, tableExtractPer || 0) +
    Math.max(0, imagesPerDoc || 0) * Math.max(0, imageExtractPer || 0);
  const oneDocCost = embedCostPerDoc + ingestPerDoc;

  const embedOneTime = oneDocCost * documents;
  const embed = embedOneTime / RATES.amortMonths;

  // ------------------------------------------------------------------
  // 4. reindex: recurring re-index of the corpus fraction + ingesting the
  //    monthly new documents.
  // ------------------------------------------------------------------
  const reindex = reindexFreqNum * embedOneTime + oneDocCost * Math.max(0, newDocsPerMonth || 0);

  // ------------------------------------------------------------------
  // 5. infra: flat monthly (editable).
  // ------------------------------------------------------------------
  const infra = Math.max(0, infraMonthly || 0);

  // ------------------------------------------------------------------
  // 6. network: internet egress (tiered free allowance) + optional
  //    NAT / cross-AZ surcharges applied to all egress GB.
  // ------------------------------------------------------------------
  const egress = overrides.cloud ?? RATES.egress[cloudProvider];
  const egressBytesPerReq =
    outputTokens * RATES.bytesPerToken +
    (crossRegion ? retrieved * RATES.bytesPerToken : 0);
  const totalEgressGB = (reqs * egressBytesPerReq) / 1e9;
  const internetEgress = Math.max(0, totalEgressGB - egress.freeGB) * egress.perGB;
  const surcharge =
    totalEgressGB *
    ((natSurcharge ? RATES.natPerGB : 0) + (crossAz ? RATES.crossAzPerGB : 0));
  const network = internetEgress + surcharge;

  // ------------------------------------------------------------------
  // 8. labor
  // ------------------------------------------------------------------
  const laborRate = Math.max(0, Number.isFinite(laborMonthly) ? laborMonthly : RATES.laborMonthly);
  const maintFracNum = clamp01(
    Number.isFinite(maintFrac) ? maintFrac : RATES.maintFrac[getDeployment(inputs)],
  );
  const labor = teamSize * laborRate * maintFracNum;

  // ------------------------------------------------------------------
  // 9. moderation / safety: per-1M-token pass over request input + output.
  // ------------------------------------------------------------------
  const moderation = moderationEnabled
    ? (reqs * (baseInputTokens + outputTokens) / 1_000_000) * Math.max(0, moderationPerM || 0)
    : 0;

  // ------------------------------------------------------------------
  // Misc line items + per-bucket flat overrides.
  // ------------------------------------------------------------------
  const miscMonthly = misc
    .filter((m) => m.cadence === 'monthly')
    .reduce((s, m) => s + (Number.isFinite(m.amount) ? m.amount : 0), 0);
  const miscOneTime = misc
    .filter((m) => m.cadence === 'oneTime')
    .reduce((s, m) => s + (Number.isFinite(m.amount) ? m.amount : 0), 0);

  const computed: Record<BucketKey, number> = {
    inference,
    reranking,
    vector,
    embed,
    reindex,
    infra,
    network,
    labor,
    moderation,
  };
  const bucketPins = overrides.buckets ?? {};
  (Object.keys(bucketPins) as BucketKey[]).forEach((k) => {
    const pin = bucketPins[k];
    if (pin != null && Number.isFinite(pin)) computed[k] = pin;
  });

  const bucketsTotal = (Object.keys(computed) as BucketKey[]).reduce(
    (s, k) => s + computed[k],
    0,
  );
  const total = bucketsTotal + miscMonthly;
  const annual = total * 12;
  const setup = embedOneTime + miscOneTime;

  return {
    inference: computed.inference,
    reranking: computed.reranking,
    vector: computed.vector,
    embed: computed.embed,
    reindex: computed.reindex,
    infra: computed.infra,
    network: computed.network,
    labor: computed.labor,
    moderation: computed.moderation,
    miscMonthly,
    miscOneTime,
    total,
    annual,
    setup,
  };
}

/** Clamp a value into [0, 1] (guards NaN → 0). */
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a number as a compact USD string.
 * Examples: 42 -> "$42", 1240 -> "$1,240", 12500 -> "$12.5k",
 *           1_200_000 -> "$1.2M", 1_500_000_000 -> "$1.5B".
 */
export function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs < 1_000) {
    return `${sign}$${stripTrailingZeros(abs.toFixed(2))}`;
  }
  if (abs < 10_000) {
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  }
  if (abs < 1_000_000) {
    return `${sign}$${compactValue(abs, 1_000, 'k')}`;
  }
  if (abs < 1_000_000_000) {
    return `${sign}$${compactValue(abs, 1_000_000, 'M')}`;
  }
  return `${sign}$${compactValue(abs, 1_000_000_000, 'B')}`;
}

/**
 * Format a number as a compact numeric string (no currency symbol).
 * Examples: 42 -> "42", 1240 -> "1,240", 100_000 -> "100k",
 *           1_200_000 -> "1.2M", 1_500_000_000 -> "1.5B".
 */
export function formatNumber(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (abs < 1_000) {
    return `${sign}${stripTrailingZeros(abs.toFixed(2))}`;
  }
  if (abs < 10_000) {
    return `${sign}${Math.round(abs).toLocaleString('en-US')}`;
  }
  if (abs < 1_000_000) {
    return `${sign}${compactValue(abs, 1_000, 'k')}`;
  }
  if (abs < 1_000_000_000) {
    return `${sign}${compactValue(abs, 1_000_000, 'M')}`;
  }
  return `${sign}${compactValue(abs, 1_000_000_000, 'B')}`;
}

function compactValue(value: number, divisor: number, suffix: string): string {
  const s = (value / divisor).toFixed(1);
  // Drop the ".0" we always add, but keep other decimals like ".5".
  return s.endsWith('.0') ? `${s.slice(0, -2)}${suffix}` : `${s}${suffix}`;
}

function stripTrailingZeros(s: string): string {
  // "1.20" -> "1.2", "1.00" -> "1", "0.50" -> "0.5".
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}
