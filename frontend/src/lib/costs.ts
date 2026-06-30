// Pure, synchronous cost-model implementation.
// All formulas come from the RAG TCO Estimator spec.

import type {
  CostBreakdown,
  DeploymentKey,
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
 *   5. infra     - Baseline infra + per-million-query charge
 *   6. obs       - Baseline observability + 5% of inference
 *   7. network   - Egress bytes (outputTokens always; retrieved if crossRegion)
 *                  with provider free tier
 *   8. labor     - teamSize * laborMonthly * maintFrac[deployment]
 *
 * `total` = sum of the 8 buckets. `annual` = `total * 12`.
 * `setup` = full (un-amortized) ingestion + embedding cost; not in `total`.
 */
export function calculateCosts(inputs: Inputs): CostBreakdown {
  const {
    documents,
    avgDocSizePages,
    tokensPerPage,
    chunkSize,
    chunkOverlap,
    requestsPerMonth,
    topK,
    systemPromptTokens,
    userQueryTokens,
    outputTokens,
    cacheHitRate,
    genModel,
    embedModel,
    reranker,
    vectorDb,
    cloudProvider,
    crossRegion,
    reindexFreq,
    teamSize,
  } = inputs;

  // ------------------------------------------------------------------
  // Numeric conversions for the union-typed inputs.
  // ------------------------------------------------------------------
  const pages = documents * DOC_SIZE_PAGES[avgDocSizePages];
  const tokensPerPageNum = TOKENS_PER_PAGE[tokensPerPage];
  const chunkSizeNum = Number(chunkSize);
  const chunkOverlapNum = Number(chunkOverlap);
  const topKNum = Number(topK);
  const systemPromptNum = Number(systemPromptTokens);
  const cacheHitRateNum = Number(cacheHitRate);
  const reindexFreqNum = Number(reindexFreq);

  // ------------------------------------------------------------------
  // Corpus / embedding derivations shared by multiple buckets.
  // ------------------------------------------------------------------
  const rawTokens = pages * tokensPerPageNum;
  const embedTokens = rawTokens * (1 + chunkOverlapNum);
  const vectors = embedTokens / chunkSizeNum;
  const dim = RATES.embedModels[embedModel].dim;
  const storageGB =
    (vectors * dim * RATES.bytesPerToken * RATES.hnswOverhead) / 1e9;

  const retrieved = topKNum * chunkSizeNum;
  const reqs = requestsPerMonth;
  const embedPerM = RATES.embedModels[embedModel].perM;

  // ------------------------------------------------------------------
  // 1. inference
  //    inTok = systemPromptTokens + retrieved + userQueryTokens
  //    effIn = inTok * (1 - cacheHitRate * cacheableFractionOfInput)
  //    API:           gen = reqs * (effIn/1e6 * in + outputTokens/1e6 * out)
  //    open-weight:   gpu = ceil(reqs*(effIn+outputTokens) / gpuCapacityReqTokens) * gpuStep
  //    + reranker:    reqs/1000 * rerankerPer1k when reranker != 'none'
  // ------------------------------------------------------------------
  const gen = RATES.genModels[genModel];
  const baseInputTokens = systemPromptNum + retrieved + userQueryTokens;
  const cachedFraction = cacheHitRateNum * RATES.cacheableFractionOfInput;
  const effectiveInputTokens = baseInputTokens * (1 - cachedFraction);

  let genCost: number;
  if ('gpuStep' in gen) {
    // Open-weight: total request-tokens (in + out) drives GPU step count.
    const totalReqTokens = reqs * (effectiveInputTokens + outputTokens);
    genCost = Math.ceil(totalReqTokens / gen.gpuCapacityReqTokens) * gen.gpuStep;
  } else {
    genCost =
      reqs *
      ((effectiveInputTokens / 1_000_000) * gen.in +
        (outputTokens / 1_000_000) * gen.out);
  }

  const rerankerCost =
    reranker !== 'none' ? (reqs / 1000) * RATES.rerankerPer1k : 0;
  const inference = genCost + rerankerCost;

  // ------------------------------------------------------------------
  // 2. vector (branch on DB per spec)
  // ------------------------------------------------------------------
  let vector: number;
  switch (vectorDb) {
    case 'pinecone':
      vector =
        RATES.vectorDbs.pinecone.base +
        storageGB * RATES.vectorDbs.pinecone.perGB +
        ((reqs * topKNum) / 1_000_000) * RATES.vectorDbs.pinecone.readsPerM +
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

  // ------------------------------------------------------------------
  // 3. embed (one-time, amortized monthly) + setup (full one-time)
  //    bucket = (embedTokens/1e6 * perM + pages * parsePerPage) / amortMonths
  // ------------------------------------------------------------------
  const embedOneTime =
    (embedTokens / 1_000_000) * embedPerM + pages * RATES.parsePerPage;
  const embed = embedOneTime / RATES.amortMonths;
  const setup = embedOneTime;

  // ------------------------------------------------------------------
  // 4. reindex: reindexFreq * (embedTokens/1e6 * perM + pages * parsePerPage)
  // ------------------------------------------------------------------
  const reindex = reindexFreqNum * embedOneTime;

  // ------------------------------------------------------------------
  // 5. infra: infraBase + reqs/1e6 * 40
  // ------------------------------------------------------------------
  const infra = RATES.infraBase + (reqs / 1_000_000) * 40;

  // ------------------------------------------------------------------
  // 6. obs: obsBase + inference * 0.05
  // ------------------------------------------------------------------
  const obs = RATES.obsBase + inference * 0.05;

  // ------------------------------------------------------------------
  // 7. network
  //    egressBytesPerReq = outputTokens*bytesPerToken
  //                       + (crossRegion ? retrieved*bytesPerToken : 0)
  //    egressGB = reqs * egressBytesPerReq / 1e9
  //    net = max(0, egressGB - freeGB) * perGB
  // ------------------------------------------------------------------
  const egress = RATES.egress[cloudProvider];
  const egressBytesPerReq =
    outputTokens * RATES.bytesPerToken +
    (crossRegion ? retrieved * RATES.bytesPerToken : 0);
  const totalEgressGB = (reqs * egressBytesPerReq) / 1e9;
  const network = Math.max(0, totalEgressGB - egress.freeGB) * egress.perGB;

  // ------------------------------------------------------------------
  // 8. labor
  // ------------------------------------------------------------------
  const deployment = getDeployment(inputs);
  const labor = teamSize * RATES.laborMonthly * RATES.maintFrac[deployment];

  const total =
    inference + vector + embed + reindex + infra + obs + network + labor;
  const annual = total * 12;

  return {
    inference,
    vector,
    embed,
    reindex,
    infra,
    obs,
    network,
    labor,
    total,
    annual,
    setup,
  };
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
