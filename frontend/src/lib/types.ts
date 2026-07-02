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

/** AI / build-tooling seat products (illustrative per-seat prices in RATES). */
export type AiToolKey =
  | 'claude-code'
  | 'cursor'
  | 'cursor-prem'
  | 'copilot-biz'
  | 'copilot-ent'
  | 'windsurf'
  | 'v0'
  | 'other';

/** A selected AI tool line: per-seat USD (editable) × number of seats. */
export interface AiToolLine {
  /** USD per seat / month (defaults from RATES; editable). */
  perSeat: number;
  seats: number;
}

export type AiToolsMode = 'byTool' | 'flat';

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
  /** Fully-loaded monthly cost per engineer (USD; editable in the UI). */
  laborMonthly: number;

  // AI / build tooling (optional; vibe-coding seat costs)
  /** Whether AI-tooling cost is entered per tool or as a flat amount. */
  aiToolsMode: AiToolsMode;
  /** Flat AI-tooling cost per month (USD) when aiToolsMode === 'flat'. */
  aiToolsFlatMonthly: number;
  /** Selected AI tools with per-seat USD + seats (byTool mode). */
  aiTools: Partial<Record<AiToolKey, AiToolLine>>;
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
  | 'labor'
  | 'aiTools';

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
  /** AI / build tooling (vibe-coding seat costs); 0 when none. */
  aiTools: number;
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

// Default scenario: "Saarthi — Government Welfare Intelligence Platform", a
// citizen-facing RAG assistant for Indian government schemes. The app lands
// pre-populated with this realistic use case; every value stays editable.
export const DEFAULT_INPUTS: Inputs = {
  // Corpus
  documents: 50_000,
  avgDocSizePages: 'long',
  tokensPerPage: 'dense',
  chunkSize: '512',
  chunkOverlap: '0.25',

  // Traffic (single-state pilot; easy to scale up live)
  requestsPerMonth: 100_000,
  topK: '10',
  rerankCandidatePool: '50',
  systemPromptTokens: '1500',
  userQueryTokens: 70,
  outputTokens: 700,
  avgSessionTurns: 3,
  cacheTTL: '1hour',
  cacheHitRate: '0.75',

  // Models
  genModel: 'gemini-3.1-pro',
  embedModel: 'cohere-v4',
  reranker: 'cohere',

  // Infra
  vectorDb: 'selfhost',
  cloudProvider: 'aws',
  crossRegion: false,
  natSurcharge: false,
  crossAz: false,
  reindexFreq: '0.08', // Monthly — government schemes change frequently
  teamSize: 0, // No labor by default (solo / AI-only builders add engineers if any)
  observability: true,
  laborMonthly: 14_000,
  aiToolsMode: 'byTool',
  aiToolsFlatMonthly: 0,
  aiTools: {},
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
