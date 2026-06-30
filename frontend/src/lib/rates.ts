// Cost-model constants for the RAG TCO Estimator.
// Values mirror the product spec in `docs/user-spec.md`. The frontend is
// illustrative only; do not change values here without updating the spec.

export const RATES = {
  // ---- Generation models -------------------------------------------------
  // API models: USD per 1M input / output tokens.
  // Open-weight: GPU step pricing (gpuStep USD per GPU, gpuCapacityReqTokens
  // request-tokens served per GPU per month). Detected by the presence of
  // `gpuStep` on the model entry.
  genModels: {
    'gpt-5.5':          { label: 'GPT-5.5',             in: 5.00,  out: 30.00 },
    'gpt-5.4':          { label: 'GPT-5.4',             in: 2.50,  out: 15.00 },
    'gpt-5.4-nano':     { label: 'GPT-5.4 nano',        in: 0.20,  out: 1.25  },
    'gpt-4.1-mini':     { label: 'GPT-4.1 mini',        in: 0.40,  out: 1.60  },
    'claude-opus-4-8':  { label: 'Claude Opus 4.8',     in: 5.00,  out: 25.00 },
    'claude-sonnet-4-6':{ label: 'Claude Sonnet 4.6',   in: 3.00,  out: 15.00 },
    'claude-haiku-4-5': { label: 'Claude Haiku 4.5',    in: 1.00,  out: 5.00  },
    'gemini-3.1-pro':   { label: 'Gemini 3.1 Pro',      in: 2.00,  out: 12.00 },
    'gemini-3.5-flash': { label: 'Gemini 3.5 Flash',    in: 1.50,  out: 9.00  },
    'gemini-3.1-flash-lite': { label: 'Gemini 3.1 Flash-Lite', in: 0.25, out: 1.50 },
    'open-weight-gpu':  {
      label: 'Open-weight (self-host GPU)',
      in: 0,
      out: 0,
      gpuStep: 1080,
      gpuCapacityReqTokens: 1_300_000_000,
    },
  } as const,

  // ---- Embedding models --------------------------------------------------
  // perM: USD per 1M tokens. dim: vector dimensionality.
  embedModels: {
    'te3-small': { label: 'OpenAI text-embedding-3-small', perM: 0.02,    dim: 1536 },
    'te3-large': { label: 'OpenAI text-embedding-3-large', perM: 0.13,    dim: 3072 },
    'cohere-v4': { label: 'Cohere embed-v4',               perM: 0.12,    dim: 1536 },
    'voyage-4':  { label: 'Voyage-4',                      perM: 0.06,    dim: 1024 },
    'google-005':{ label: 'Google text-embedding-005',     perM: 0.00625, dim: 768  },
    'bge-m3':    { label: 'Self-hosted BGE-M3 (GPU)',      perM: 0.001,   dim: 1024 },
  } as const,

  // ---- Reranker ----------------------------------------------------------
  // Scalar USD per 1,000 searches. See cost model bucket 1.
  rerankerPer1k: 2.00,

  // ---- Vector databases --------------------------------------------------
  // managed: true = hosted SaaS, false = self-hosted node.
  // Schema per spec; not every DB exposes every field.
  vectorDbs: {
    'pinecone':   { label: 'Pinecone Serverless (managed)', base: 50, perGB: 0.33, readsPerM: 16, writesPerM: 2, managed: true  },
    'weaviate':   { label: 'Weaviate Cloud Flex (managed)', base: 45, perMdim: 0.095, managed: true },
    'qdrant-cloud':{label: 'Qdrant Cloud (managed)',        base: 65, perGB: 0, readsPerM: 0, writesPerM: 0, managed: true },
    'pgvector-rds':{label: 'pgvector on RDS (managed-ish)', base: 45, perGB: 0, managed: true },
    'selfhost':   { label: 'Self-hosted Qdrant/Weaviate (VPS)', nodeGBcap: 18, nodeCost: 96, managed: false },
  } as const,

  // ---- Cloud egress (network data transfer) ------------------------------
  // perGB: USD per GB transferred. freeGB: monthly free allowance (GB).
  egress: {
    'aws':     { label: 'AWS',             perGB: 0.09,   freeGB: 100 },
    'azure':   { label: 'Azure',           perGB: 0.087,  freeGB: 100 },
    'gcp':     { label: 'GCP Premium',     perGB: 0.12,   freeGB: 0   },
    'gcp-std': { label: 'GCP Standard',    perGB: 0.085,  freeGB: 0   },
    'r2':      { label: 'Cloudflare R2',   perGB: 0.00,   freeGB: 0   },
    'oracle':  { label: 'Oracle Cloud',    perGB: 0.0085, freeGB: 10000 },
  } as const,

  // ---- Scalar constants --------------------------------------------------
  /** Bytes per token (FP32 vector storage). */
  bytesPerToken: 4,
  /** USD per page for parsing / extraction. */
  parsePerPage: 0.0012,
  /** Multiplier applied to raw vector storage to account for the HNSW index. */
  hnswOverhead: 1.5,
  /** Fraction of input context that is cacheable. */
  cacheableFractionOfInput: 0.7,
  /** Fully-loaded monthly cost per engineer (USD). */
  laborMonthly: 14_000,
  /** Maintenance-time fraction per deployment type. */
  maintFrac: { managed: 0.22, selfhosted: 0.55 } as const,
  /** Baseline monthly infra cost (USD). */
  infraBase: 55,
  /** Baseline monthly observability / evals cost (USD). */
  obsBase: 120,
  /** Months over which one-time setup (ingestion + embedding) is amortized. */
  amortMonths: 12,
} as const;

// ---------------------------------------------------------------------------
// Lookup tables for the union-typed inputs.
// ---------------------------------------------------------------------------

/** Average pages per document. */
export const DOC_SIZE_PAGES = {
  short: 3,
  standard: 10,
  long: 40,
  report: 120,
} as const;

/** Tokens per page of extracted text. */
export const TOKENS_PER_PAGE = {
  sparse: 300,
  standard: 500,
  dense: 650,
} as const;
