// Shared domain types for the RAG TCO Estimator.
// `deployment` is derived from `vectorDb` inside calculateCosts/getDeployment;
// it is intentionally not a field of `Inputs`.

// ---------------------------------------------------------------------------
// Discrete input categories (string keys with finite option sets)
// ---------------------------------------------------------------------------

export type DocSizeKey = 'short' | 'standard' | 'long' | 'report' | 'custom';
export type DensityKey = 'sparse' | 'standard' | 'dense' | 'custom';
export type ChunkSizeKey = '256' | '512' | '1024';
export type OverlapKey = '0' | '0.10' | '0.25';
export type TopKKey = '3' | '5' | '10' | '20';
export type SystemPromptKey = '500' | '1500' | '3000' | 'custom';
export type CacheRateKey = '0' | '0.5' | '0.75' | '0.9';
export type CacheTTLKey = 'off' | '5min' | '1hour';
export type ReindexKey = '0' | '0.08' | '0.30';
export type RerankerKey = 'none' | 'cohere';
export type RerankPoolKey = '25' | '50' | '100';

export type GenModelKey =
  | 'gpt-5.5'
  | 'gpt-5.4'
  | 'gpt-5.4-nano'
  | 'gpt-4.1-mini'
  | 'claude-opus-4-8'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5'
  | 'gemini-3.1-pro'
  | 'gemini-3.5-flash'
  | 'gemini-3.1-flash-lite'
  | 'open-weight-gpu';

export type EmbedModelKey =
  | 'te3-small'
  | 'te3-large'
  | 'cohere-v4'
  | 'voyage-4'
  | 'google-005'
  | 'bge-m3';

export type VectorDbKey =
  | 'pinecone'
  | 'weaviate'
  | 'qdrant-cloud'
  | 'pgvector-rds'
  | 'selfhost';

export type CloudProviderKey =
  | 'aws'
  | 'azure'
  | 'gcp'
  | 'gcp-std'
  | 'r2'
  | 'oracle';

/** Deployment classification derived from the chosen vector DB. */
export type DeploymentKey = 'managed' | 'selfhosted';

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface Inputs {
  // Corpus
  /** Total documents in the corpus. */
  documents: number;
  /** Average document length bucket. */
  avgDocSizePages: DocSizeKey;
  /** Custom pages/doc, used when avgDocSizePages === 'custom'. */
  avgDocSizePagesCustom?: number;
  /** Text density bucket (tokens per page). */
  tokensPerPage: DensityKey;
  /** Custom tokens/page, used when tokensPerPage === 'custom'. */
  tokensPerPageCustom?: number;
  /** Chunk size in tokens. */
  chunkSize: ChunkSizeKey;
  /** Fraction of overlap between adjacent chunks. */
  chunkOverlap: OverlapKey;

  // Traffic
  /** Monthly RAG query volume. */
  requestsPerMonth: number;
  /** Number of chunks retrieved per query. */
  topK: TopKKey;
  /** Candidate pool fetched before reranking (drives reads + rerank scope). */
  rerankCandidatePool: RerankPoolKey;
  /** System prompt size bucket. */
  systemPromptTokens: SystemPromptKey;
  /** Custom system-prompt tokens, used when systemPromptTokens === 'custom'. */
  systemPromptTokensCustom?: number;
  /** Average user query size in tokens. */
  userQueryTokens: number;
  /** Average generated output size in tokens. */
  outputTokens: number;
  /** Average turns per session (UI-only derivation). */
  avgSessionTurns: number;
  /** Prompt cache TTL tier (off disables caching entirely). */
  cacheTTL: CacheTTLKey;
  /** Prompt cache hit rate bucket. */
  cacheHitRate: CacheRateKey;

  // Models
  /** Generation model. */
  genModel: GenModelKey;
  /** Embedding model. */
  embedModel: EmbedModelKey;
  /** Reranker (or 'none'). */
  reranker: RerankerKey;

  // Infra
  /** Vector database. */
  vectorDb: VectorDbKey;
  /** Cloud provider for egress. */
  cloudProvider: CloudProviderKey;
  /** Whether requests cross regions (incurs retrieved-context egress). */
  crossRegion: boolean;
  /** NAT Gateway surcharge on egress (+$/GB). */
  natSurcharge: boolean;
  /** Cross-AZ traffic surcharge on egress (+$/GB each way). */
  crossAz: boolean;
  /** Fraction of the corpus re-indexed per month. */
  reindexFreq: ReindexKey;
  /** Engineering team size. */
  teamSize: number;
  /** Whether an observability/evals line is budgeted. */
  observability: boolean;
}

// ---------------------------------------------------------------------------
// Custom-pricing overrides & miscellaneous cost lines (Estimate tab only).
// Passed to calculateCosts as a second argument so other tabs are unaffected.
// ---------------------------------------------------------------------------

/** Bucket identifiers usable as flat $/mo pin targets. */
export type BucketKey =
  | 'inference'
  | 'reranking'
  | 'vector'
  | 'embed'
  | 'reindex'
  | 'infra'
  | 'obs'
  | 'network'
  | 'labor';

export interface GenOverride {
  /** $/1M input tokens. */
  in?: number;
  /** $/1M output tokens. */
  out?: number;
  /** Flat $/mo (self-host style); when set, replaces per-token generation. */
  gpuMonthly?: number;
}

export interface EmbedOverride {
  /** $/1M input tokens. */
  perM: number;
  /** Vector dimensionality. */
  dim: number;
}

export interface VectorOverride {
  /** Simple flat $/mo for the whole vector bucket. */
  flatMonthly?: number;
  /** Advanced: monthly base fee. */
  base?: number;
  /** Advanced: $/GB stored. */
  perGB?: number;
  /** Advanced: $ per 1M reads. */
  readsPerM?: number;
  /** Advanced: $ per 1M writes. */
  writesPerM?: number;
}

export interface RerankOverride {
  /** $ per 1k searches. */
  per1k?: number;
  /** Flat $/mo (self-host GPU). */
  gpuMonthly?: number;
}

export interface CloudOverride {
  /** $/GB egress. */
  perGB: number;
  /** Free monthly GB allowance. */
  freeGB: number;
}

export interface Overrides {
  genModel?: GenOverride;
  embedModel?: EmbedOverride;
  vectorDb?: VectorOverride;
  reranker?: RerankOverride;
  cloud?: CloudOverride;
  /** Per-bucket flat $/mo pins that replace the computed value. */
  buckets?: Partial<Record<BucketKey, number>>;
}

export type MiscCadence = 'monthly' | 'oneTime';

export interface MiscItem {
  id: string;
  label: string;
  amount: number;
  cadence: MiscCadence;
  note?: string;
}

export interface EstimateExtras {
  overrides?: Overrides;
  misc?: MiscItem[];
}

// ---------------------------------------------------------------------------
// Cost breakdown
// ---------------------------------------------------------------------------

/**
 * Monthly cost breakdown, ordered to match the 8 buckets in the spec:
 *   1. inference  - generation (API or open-weight GPU) + reranker
 *   2. vector     - vector database hosting
 *   3. embed      - amortized one-time embedding + parse
 *   4. reindex    - monthly re-embedding of the reindex fraction
 *   5. infra      - baseline infra + per-million-query charge
 *   6. obs        - baseline observability + 5% of inference
 *   7. network    - egress (outputTokens always, retrieved if crossRegion) with provider free tier
 *   8. labor      - teamSize * laborMonthly * maintFrac[deployment]
 *
 * `total` is the sum of the 8 buckets; `annual` is `total * 12`.
 * `setup` is the one-time ingestion + embedding cost (NOT in `total`).
 */
export interface CostBreakdown {
  inference: number;
  /** Reranking (split out of inference); 0 when no reranker. */
  reranking: number;
  vector: number;
  embed: number;
  reindex: number;
  infra: number;
  obs: number;
  network: number;
  labor: number;
  /** Sum of monthly misc line items (0 when none). */
  miscMonthly: number;
  /** Sum of one-time misc line items (already folded into `setup`). */
  miscOneTime: number;
  total: number;
  annual: number;
  setup: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_INPUTS: Inputs = {
  // Corpus
  documents: 100_000,
  avgDocSizePages: 'standard',
  tokensPerPage: 'standard',
  chunkSize: '512',
  chunkOverlap: '0.10',

  // Traffic
  requestsPerMonth: 100_000,
  topK: '5',
  rerankCandidatePool: '50',
  systemPromptTokens: '1500',
  userQueryTokens: 200,
  outputTokens: 500,
  avgSessionTurns: 4,
  cacheTTL: '5min',
  cacheHitRate: '0.5',

  // Models
  genModel: 'gpt-5.4',
  embedModel: 'te3-small',
  reranker: 'none',

  // Infra
  vectorDb: 'pinecone',
  cloudProvider: 'aws',
  crossRegion: false,
  natSurcharge: false,
  crossAz: false,
  reindexFreq: '0.08',
  teamSize: 2,
  observability: true,
};
