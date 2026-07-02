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
export type CacheRateKey = '0' | '0.2' | '0.5' | '0.75' | '0.9';
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
  /** Fully-loaded monthly cost per engineer (USD). */
  laborMonthly: number;
  /** Fraction of an engineer's time spent maintaining the system (editable). */
  maintFrac: number;

  // ---- Excel-parity levers (Saarthi Phase-3) ----------------------------
  /** Conversation history tokens added to each request's input. */
  conversationHistoryTokens: number;
  /** Fraction of queries served from a semantic cache (skip generation). */
  semanticCacheHitRate: number;
  /** Fraction of chunks that are duplicates (reduces stored vectors). */
  dupChunkPct: number;
  /** New documents ingested per month (recurring ingestion + re-index). */
  newDocsPerMonth: number;
  // Ingestion detail (one-time / per new doc)
  /** Fraction of pages needing OCR. */
  ocrPct: number;
  /** OCR cost per page (USD). */
  ocrPerPage: number;
  /** Parser / extraction cost per page (USD). */
  parserPerPage: number;
  /** Avg tables per document. */
  tablesPerDoc: number;
  /** Table-extraction cost per table (USD). */
  tableExtractPer: number;
  /** Avg images per document. */
  imagesPerDoc: number;
  /** Image-extraction cost per image (USD). */
  imageExtractPer: number;
  // Safety & infra
  /** Whether a safety/moderation pass runs on each request. */
  moderationEnabled: boolean;
  /** Moderation cost per 1M tokens (USD). */
  moderationPerM: number;
  /** Flat monthly infrastructure cost (USD: app servers, LB, Redis, monitoring, storage). */
  infraMonthly: number;
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
  | 'network'
  | 'labor'
  | 'moderation';

/** User-supplied name for a custom ("Bring Your Model") choice. */
export interface CustomNamed {
  /** Display name; falls back to "Bring Your Model" when blank. */
  name?: string;
}

export interface GenOverride extends CustomNamed {
  /** $/1M input tokens. */
  in?: number;
  /** $/1M output tokens. */
  out?: number;
  /** Flat $/mo (self-host style); when set, replaces per-token generation. */
  gpuMonthly?: number;
}

export interface EmbedOverride extends CustomNamed {
  /** $/1M input tokens. */
  perM: number;
  /** Vector dimensionality. */
  dim: number;
}

export interface VectorOverride extends CustomNamed {
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

export interface RerankOverride extends CustomNamed {
  /** $ per 1k searches. */
  per1k?: number;
  /** Flat $/mo (self-host GPU). */
  gpuMonthly?: number;
}

export interface CloudOverride extends CustomNamed {
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
 *   5. infra      - flat monthly infra (monitoring/servers/storage)
 *   6. network    - egress (outputTokens always, retrieved if crossRegion) with provider free tier
 *   7. labor      - teamSize * laborMonthly * maintFrac
 *   8. moderation - optional per-token safety pass
 *
 * `total` is the sum of the buckets; `annual` is `total * 12`.
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
  network: number;
  labor: number;
  /** Safety / moderation pass; 0 when disabled. */
  moderation: number;
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

// Default scenario: "Saarthi — Government Welfare Intelligence Platform" (Phase-3
// pilot), a citizen-facing RAG assistant for Indian government schemes. Values
// mirror the team's Excel model (rag_tco_calculator.xlsx). Everything is editable.
export const DEFAULT_INPUTS: Inputs = {
  // Corpus
  documents: 500, // Excel "Total Base Documents" = 500 (Phase-3 pilot)
  avgDocSizePages: 'standard', // Excel "Avg Pages per Document" = 10
  tokensPerPage: 'standard', // Excel ~530 tok/page → closest option (500)
  chunkSize: '512',
  chunkOverlap: '0.10', // Excel overlap = 50 tokens (~10%)

  // Traffic (300 MAU × 20 queries/user = 6,000 queries/month)
  requestsPerMonth: 6_000,
  topK: '10',
  rerankCandidatePool: '50',
  systemPromptTokens: '500', // Excel "System Prompt Tokens" = 500
  userQueryTokens: 1_000, // Excel "Avg Query Prompt Tokens" = 1000
  outputTokens: 800, // Excel "Avg Output Tokens" = 800
  avgSessionTurns: 3,
  cacheTTL: '5min', // Excel doesn't model a 1-hour cache-write surcharge
  cacheHitRate: '0.2', // Excel "Prompt Cache Hit Rate" = 0.2

  // Models
  genModel: 'gpt-5.4-nano', // cheap-tier successor to Excel's "GPT-4o mini"
  embedModel: 'te3-small', // Excel default
  reranker: 'cohere', // Cohere Rerank v3.5, active

  // Infra
  vectorDb: 'pgvector-rds', // AWS RDS pgvector (db.t4g.medium) ~$30/mo flat
  cloudProvider: 'aws',
  crossRegion: false,
  natSurcharge: false,
  crossAz: false,
  reindexFreq: '0', // Excel monthly = new-docs ingestion only (no corpus re-index line)
  teamSize: 0, // Excel "SRE DevOps FTE count" = 0 → no labor
  laborMonthly: 0, // no labor cost by default (edit to add loaded cost/engineer)
  maintFrac: 0.22, // managed-stack default (share of an engineer on upkeep)

  // Excel-parity levers
  conversationHistoryTokens: 1_200,
  semanticCacheHitRate: 0.1, // Excel "Semantic Cache Hit Rate" = 0.1
  dupChunkPct: 0.05,
  newDocsPerMonth: 10,
  ocrPct: 0.2,
  ocrPerPage: 0.015,
  parserPerPage: 0.003,
  tablesPerDoc: 1,
  tableExtractPer: 0.02,
  imagesPerDoc: 2,
  imageExtractPer: 0.01,
  moderationEnabled: true,
  moderationPerM: 0.15,
  infraMonthly: 98, // Excel "Cloud Infrastructure Cost" ≈ $98/mo
};

// Pre-loaded planning-gap misc lines for the Saarthi scenario. Each defaults to
// $0/mo (fully editable) with a note, so the landing view shows the planning
// checklist this use case implies.
export const DEFAULT_MISC: MiscItem[] = [
  {
    id: 'gap-multilingual',
    label: 'Multilingual token overhead (Indic ~2×)',
    amount: 0,
    cadence: 'monthly',
    note: 'Hindi/regional answers use ~2× tokens',
  },
  {
    id: 'gap-query-mix',
    label: 'Query-mix: complex/high-token queries (14–15)',
    amount: 0,
    cadence: 'monthly',
    note: 'multi-part queries drive per-query cost',
  },
  {
    id: 'gap-model-routing',
    label: 'Model routing (cheap vs premium)',
    amount: 0,
    cadence: 'monthly',
    note: 'routing lowers real cost; tool models one model',
  },
  {
    id: 'gap-data-residency',
    label: 'Data residency / compliance (gov)',
    amount: 0,
    cadence: 'monthly',
    note: 'in-country hosting + audits',
  },
  {
    id: 'gap-guardrails',
    label: 'Guardrails / answer validation',
    amount: 0,
    cadence: 'monthly',
    note: 'wrong benefit amounts are high-harm',
  },
  {
    id: 'gap-reindexing',
    label: 'Corpus re-indexing (scheme updates)',
    amount: 0,
    cadence: 'monthly',
    note: 'recurring as schemes change',
  },
];
