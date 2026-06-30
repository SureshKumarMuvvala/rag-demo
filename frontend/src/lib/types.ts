// Shared domain types for the RAG TCO Estimator.
// `deployment` is derived from `vectorDb` inside calculateCosts/getDeployment;
// it is intentionally not a field of `Inputs`.

// ---------------------------------------------------------------------------
// Discrete input categories (string keys with finite option sets)
// ---------------------------------------------------------------------------

export type DocSizeKey = 'short' | 'standard' | 'long' | 'report';
export type DensityKey = 'sparse' | 'standard' | 'dense';
export type ChunkSizeKey = '256' | '512' | '1024';
export type OverlapKey = '0' | '0.10' | '0.25';
export type TopKKey = '3' | '5' | '10' | '20';
export type SystemPromptKey = '500' | '1500' | '3000';
export type CacheRateKey = '0' | '0.5' | '0.75' | '0.9';
export type ReindexKey = '0' | '0.08' | '0.30';
export type RerankerKey = 'none' | 'cohere';

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
  /** Text density bucket (tokens per page). */
  tokensPerPage: DensityKey;
  /** Chunk size in tokens. */
  chunkSize: ChunkSizeKey;
  /** Fraction of overlap between adjacent chunks. */
  chunkOverlap: OverlapKey;

  // Traffic
  /** Monthly RAG query volume. */
  requestsPerMonth: number;
  /** Number of chunks retrieved per query. */
  topK: TopKKey;
  /** System prompt size bucket. */
  systemPromptTokens: SystemPromptKey;
  /** Average user query size in tokens. */
  userQueryTokens: number;
  /** Average generated output size in tokens. */
  outputTokens: number;
  /** Average turns per session (UI-only derivation). */
  avgSessionTurns: number;
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
  /** Fraction of the corpus re-indexed per month. */
  reindexFreq: ReindexKey;
  /** Engineering team size. */
  teamSize: number;
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
  vector: number;
  embed: number;
  reindex: number;
  infra: number;
  obs: number;
  network: number;
  labor: number;
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
  systemPromptTokens: '1500',
  userQueryTokens: 200,
  outputTokens: 500,
  avgSessionTurns: 4,
  cacheHitRate: '0.5',

  // Models
  genModel: 'gpt-5.4',
  embedModel: 'te3-small',
  reranker: 'none',

  // Infra
  vectorDb: 'pinecone',
  cloudProvider: 'aws',
  crossRegion: false,
  reindexFreq: '0.08',
  teamSize: 2,
};
