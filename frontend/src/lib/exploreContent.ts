// Static content for the Explore tab. Prose, tables, links, pipeline diagram,
// overlays and glossary are transcribed verbatim from the product spec — do not
// invent extra models, prices or providers. Row→Estimate mappings below connect
// selectable table rows to the shared Inputs state used by the Estimate tab.

import type {
  CloudProviderKey,
  EmbedModelKey,
  GenModelKey,
  RerankerKey,
  VectorDbKey,
} from './types';
import type { IconName } from '../components/Icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Estimate field a topic's "Use in Estimate" preset targets. */
export type PresetField =
  | 'tokensPerPage'
  | 'embedModel'
  | 'vectorDb'
  | 'reranker'
  | 'genModel'
  | 'cacheTTL'
  | 'cloudProvider';

export interface Fact {
  k: string;
  v: string;
}

export interface Section {
  h: string;
  /** Scannable one-idea-per-bullet points. */
  bullets?: string[];
  /** Optional key–value rows for dense numeric content. */
  facts?: Fact[];
}

export interface TopicTable {
  title: string;
  cols: string[];
  rows: string[][];
}

export interface TopicLink {
  label: string;
  url: string;
}

export interface Preset {
  field: PresetField;
  note?: string;
}

export type WidgetKind = 'tokenLab' | 'glossaryFilter';

export interface Topic {
  id: string;
  icon: IconName;
  title: string;
  summary: string;
  sections: Section[];
  widget?: WidgetKind;
  table?: TopicTable | null;
  links: TopicLink[];
  preset: Preset | null;
}

// ---------------------------------------------------------------------------
// CONTENT
// ---------------------------------------------------------------------------

export const CONTENT: Topic[] = [
  {
    id: 'overview',
    icon: 'map',
    title: 'How RAG cost works',
    summary: 'Eight cost layers — most teams budget only the first.',
    sections: [
      {
        h: 'The pipeline',
        bullets: [
          'Ingest & embed your docs → store vectors',
          'At query time: retrieve candidates → (optionally) rerank',
          'Feed top-K as context to a generation model → return the answer',
          'Each arrow costs money',
        ],
      },
      {
        h: 'The eight layers',
        bullets: [
          'Inference (generation)',
          'Reranking',
          'Vector storage & retrieval',
          'Ingestion & embedding',
          'Re-indexing',
          'App / compute infra',
          'Observability & evals',
          'Engineering labor',
          "Inference is the visible one; the other seven are the 'waterline' costs",
        ],
      },
      {
        h: 'The one lesson',
        facts: [
          { k: 'Low volume', v: 'labor dominates' },
          { k: 'High volume', v: 'inference dominates' },
          { k: 'At rest', v: 'storage dominates' },
        ],
        bullets: [
          'Design decisions (model, chunking, caching, managed vs self-host) move the totals more than any single price',
        ],
      },
    ],
    links: [],
    preset: null,
  },
  {
    id: 'documents',
    icon: 'file-text',
    title: 'Documents & tokens',
    summary:
      'How many tokens a page really costs — and why format matters more than length.',
    sections: [
      {
        h: 'A token ≈ ¾ of a word',
        bullets: [
          '~4 characters of English ≈ 1 token',
          'Cost scales with tokens, not pages',
          'Same content can cost 5× more depending on how you feed it in',
        ],
      },
      {
        h: 'Tokens per page (rules of thumb)',
        facts: [
          { k: 'Clean text page', v: '~350–600 tokens (use ~500)' },
          { k: 'Table-heavy page', v: '~1.5–2× text (~800–1,200)' },
          { k: 'Scanned / image page', v: '~250–1,300 (vision; OpenAI 1024px ≈ 1,290)' },
          { k: 'Raw PDF (as-is)', v: '1,500–3,000 / page (layout + binary noise)' },
        ],
      },
      {
        h: 'Biggest lever: convert to Markdown first',
        bullets: [
          'Strip PDF noise → clean Markdown cuts tokens ~65–90%, no content loss',
          'Tools: pymupdf4llm, Marker, MarkItDown',
          'Usually the highest-ROI ingestion optimization',
        ],
      },
      {
        h: 'Chunking',
        bullets: [
          'Split docs into chunks (256 / 512 / 1024 tokens) before embedding',
          'Overlap (10–25%) improves retrieval',
          '…but inflates embed tokens AND the number of vectors stored',
        ],
      },
    ],
    widget: 'tokenLab',
    table: {
      title: 'Token estimate per page by content type',
      cols: ['Content type', '~Tokens/page', 'Note'],
      rows: [
        ['Clean prose (text)', '350–600', 'baseline; ~500 typical'],
        ['Table-heavy', '800–1,200', 'tables tokenize poorly'],
        ['Slide / sparse', '150–350', 'little text per page'],
        ['Scanned/image (vision)', '250–1,300', 'billed as image tokens'],
        ['Raw PDF (unconverted)', '1,500–3,000', 'convert to Markdown to cut 65–90%'],
      ],
    },
    links: [
      { label: 'OpenAI tokenizer / counting', url: 'https://platform.openai.com/tokenizer' },
    ],
    preset: { field: 'tokensPerPage', note: 'Set your avg tokens/page from the lab above.' },
  },
  {
    id: 'embeddings',
    icon: 'vector',
    title: 'Embedding models',
    summary:
      'Turn text into vectors. Cheap per token — but the dimension you pick drives storage forever.',
    sections: [
      {
        h: 'What it is',
        bullets: [
          'Maps each chunk to a vector of N numbers (dimensions)',
          'Similar meaning → nearby vectors',
          'Billed per input token; there are no output tokens',
        ],
      },
      {
        h: 'Why dimension matters',
        facts: [
          { k: 'Storage', v: 'vectors × dimensions × 4 bytes (float32) × ~1.5 HNSW overhead' },
        ],
        bullets: [
          'A 3072-dim model costs ~4× the storage of a 768-dim one (same corpus)',
          'Matryoshka truncation (OpenAI, Cohere, Voyage) trades a little quality for smaller vectors',
        ],
      },
      {
        h: 'Cost reality',
        bullets: [
          'Embedding is the cheapest API line — often a few dollars for a whole corpus',
          'The recurring vector STORAGE it creates usually dwarfs the one-time embedding cost within a few months',
        ],
      },
    ],
    table: {
      title: 'Embedding models (per 1M input tokens · dimensions)',
      cols: ['Model', '$/1M', 'Dims', 'Notes'],
      rows: [
        ['OpenAI text-embedding-3-small', '$0.02', '1536', 'default, great value'],
        ['OpenAI text-embedding-3-large', '$0.13', '3072', 'higher quality, 6.5x price'],
        ['Cohere embed-v4', '$0.12', '1536', 'multilingual, binary quant'],
        ['Voyage-4', '$0.06', '1024', '(lite $0.02)'],
        ['Google text-embedding-005', '$0.00625', '768', 'cheapest hosted'],
        ['Self-host BGE-M3 / E5 / nomic', '~$0 + GPU', '768–1024', 'free weights, you run it'],
      ],
    },
    links: [
      { label: 'OpenAI pricing', url: 'https://openai.com/api/pricing/' },
      { label: 'Cohere pricing', url: 'https://cohere.com/pricing' },
      { label: 'Voyage pricing', url: 'https://docs.voyageai.com/docs/pricing' },
      { label: 'Google Gemini pricing', url: 'https://ai.google.dev/gemini-api/docs/pricing' },
    ],
    preset: { field: 'embedModel' },
  },
  {
    id: 'vectordb',
    icon: 'database',
    title: 'Vector databases',
    summary:
      'Where vectors live. ~10 managed services, ~9 self-host engines — pricing models differ wildly.',
    sections: [
      {
        h: 'What it is',
        bullets: [
          'Store optimized for nearest-neighbor search over embeddings (usually an HNSW index)',
          'At query time it returns the top candidates for a query vector',
          'Supports metadata filtering',
        ],
      },
      {
        h: 'Managed vs self-hosted',
        facts: [
          { k: 'Managed', v: 'zero ops, higher per-unit cost; per-GB + per-read/write or per-node-hour' },
          { k: 'Self-hosted', v: 'free license; pay only infra (VPS/K8s node) + engineering time' },
          { k: 'Crossover', v: 'usually tens of millions of vectors or high query volume' },
        ],
      },
      {
        h: 'Cost levers',
        bullets: [
          'Storage (GB, driven by dimensions)',
          'Read units (queries × candidates fetched)',
          'Write units (upserts)',
          'Re-index compute when you change models',
          'Managed bills routinely land 2.5–4× higher in production once reads/writes/egress are included',
        ],
      },
    ],
    table: {
      title: 'Providers (illustrative @ ~10M vectors)',
      cols: ['Option', 'Type', '~Cost', 'Billing'],
      rows: [
        ['Pinecone Serverless', 'managed', '~$70/mo', '$0.33/GB + $16/M reads + writes'],
        ['Weaviate Cloud', 'managed', '~$135/mo', '$45 base + $0.095/M dimensions'],
        ['Qdrant Cloud', 'managed', '~$65/mo', 'per node RAM/vCPU-hour'],
        ['Zilliz Cloud (Milvus)', 'managed', 'varies', 'per compute unit; best >1B vectors'],
        [
          'MongoDB Atlas / Redis / Elastic / Azure AI Search',
          'managed',
          'varies',
          'add-on to existing DB',
        ],
        ['pgvector (Supabase/Neon/RDS)', 'managed-ish', '~$45/mo', 'Postgres instance cost'],
        [
          'Qdrant / Weaviate / Milvus / Chroma / pgvector / Vespa / LanceDB / FAISS',
          'self-host',
          'infra only',
          '$96/mo per ~16GB node + ops time',
        ],
      ],
    },
    links: [
      { label: 'Pinecone', url: 'https://www.pinecone.io/pricing/' },
      { label: 'Weaviate', url: 'https://weaviate.io/pricing' },
      { label: 'Qdrant', url: 'https://qdrant.tech/pricing/' },
      { label: 'Zilliz/Milvus', url: 'https://zilliz.com/pricing' },
      { label: 'Chroma', url: 'https://www.trychroma.com/pricing' },
    ],
    preset: { field: 'vectorDb' },
  },
  {
    id: 'reranking',
    icon: 'sort',
    title: 'Reranking',
    summary:
      'A cheap second pass that lifts retrieval precision 15–40%. Optional, but usually worth it.',
    sections: [
      {
        h: 'What it is',
        bullets: [
          'First-stage retrieval (bi-encoder) fetches ~50–100 candidates fast but imprecisely',
          'A reranker (cross-encoder) reads each query+document pair TOGETHER and re-sorts them',
          'Pass only the top ~10 best chunks to the LLM → better answers AND fewer context tokens',
        ],
      },
      {
        h: "How it's billed",
        bullets: [
          'Managed rerankers charge per SEARCH (one search re-scores the whole candidate pool)',
          'Documents over ~500 tokens split into chunks that each count',
          'Self-hosted rerankers cost only GPU',
        ],
      },
      {
        h: 'When to skip',
        bullets: [
          'Small/clean corpus where retrieval already returns the right chunk first',
          'A reranker adds latency for little gain there',
          'Measure lift on YOUR corpus',
        ],
      },
    ],
    table: {
      title: 'Rerankers',
      cols: ['Model', 'Type', '~Price', 'Notes'],
      rows: [
        ['Cohere Rerank v3.5', 'managed', '$1 / 1k searches', 'fast, 100+ langs'],
        ['Cohere Rerank 4 Fast / Pro', 'managed', '$2 / $2.50 per 1k', 'Pro = top accuracy'],
        ['Voyage rerank-2.5', 'managed', 'per search', 'best speed/quality balance'],
        ['Jina Reranker v2/v3', 'managed*', 'per search', 'fast; weights non-commercial'],
        ['Zerank-1 / Zerank 2', 'managed', '~$0.025/M tokens', 'top benchmark ELO'],
        ['BGE Reranker v2-m3', 'self-host', 'GPU only', 'Apache-2.0 default OSS pick'],
        [
          'mxbai-rerank-large-v2 / Qwen3 / gte-modernbert / ColBERTv2',
          'self-host',
          'GPU only',
          'open licenses',
        ],
      ],
    },
    links: [
      { label: 'Cohere Rerank', url: 'https://cohere.com/rerank' },
      { label: 'Voyage rerank', url: 'https://docs.voyageai.com/docs/pricing' },
      { label: 'BGE reranker (HF)', url: 'https://huggingface.co/BAAI/bge-reranker-v2-m3' },
    ],
    preset: { field: 'reranker' },
  },
  {
    id: 'generation',
    icon: 'cpu',
    title: 'Generation models',
    summary:
      'The answer model — usually the largest per-request cost. Output tokens cost 4–5x input.',
    sections: [
      {
        h: 'Providers',
        facts: [
          { k: 'Closed APIs', v: 'OpenAI (GPT-5.x), Anthropic (Claude), Google (Gemini), Cohere (Command), Mistral, xAI (Grok)' },
          { k: 'Open-weight', v: 'Meta Llama, Qwen, DeepSeek (self-host or rent)' },
          { k: 'Aggregators / hosts', v: 'OpenRouter, AWS Bedrock, Google Vertex, Azure AI Foundry' },
        ],
      },
      {
        h: 'What drives cost',
        bullets: [
          'Input tokens = system prompt + retrieved context + query',
          'Output tokens cost 4–5× input',
          "Reasoning models bill hidden 'thinking' tokens at the output rate",
          'Context above ~200–270K often triggers a higher pricing tier',
        ],
      },
      {
        h: 'Cheapest lever',
        bullets: [
          'Route simple work to a small model (nano / flash / haiku)',
          'Reserve the flagship for hard queries',
          'Cache the stable prefix (see Caching)',
        ],
      },
    ],
    table: {
      title: 'Generation models (per 1M tokens · input / output)',
      cols: ['Model', 'Input', 'Output'],
      rows: [
        ['GPT-5.5', '$5.00', '$30.00'],
        ['GPT-5.4', '$2.50', '$15.00'],
        ['GPT-5.4 nano', '$0.20', '$1.25'],
        ['Claude Opus 4.8', '$5.00', '$25.00'],
        ['Claude Sonnet 4.6', '$3.00', '$15.00'],
        ['Claude Haiku 4.5', '$1.00', '$5.00'],
        ['Gemini 3.1 Pro', '$2.00', '$12.00'],
        ['Gemini 3.5 Flash', '$1.50', '$9.00'],
        ['Gemini 3.1 Flash-Lite', '$0.25', '$1.50'],
        ['Open-weight (self-host GPU)', 'GPU only', 'GPU only'],
      ],
    },
    links: [
      { label: 'OpenAI', url: 'https://openai.com/api/pricing/' },
      { label: 'Anthropic', url: 'https://www.anthropic.com/pricing' },
      { label: 'Google Gemini', url: 'https://ai.google.dev/gemini-api/docs/pricing' },
      { label: 'OpenRouter (compare)', url: 'https://openrouter.ai/models' },
    ],
    preset: { field: 'genModel' },
  },
  {
    id: 'caching',
    icon: 'layers',
    title: 'Prompt caching',
    summary: 'Reuse a stable prompt prefix for ~90% off its input cost. Huge for RAG.',
    sections: [
      {
        h: 'How it works',
        bullets: ['Providers cache a stable prompt prefix (system prompt, instructions, few-shot)'],
        facts: [
          { k: 'Cache hit (read)', v: '~10% of input rate (90% off)' },
          { k: '5-min TTL write', v: '~1.25× input' },
          { k: '1-hour TTL write', v: '~2× input' },
        ],
      },
      {
        h: 'The RAG catch',
        bullets: [
          'Only the STABLE prefix caches',
          'Retrieved context and the user query change every request → never cache',
          'RAG caching saves less than people expect unless you reuse context across turns in a session',
        ],
      },
    ],
    table: {
      title: 'Cache economics',
      cols: ['Event', 'Cost vs input rate'],
      rows: [
        ['Cache hit (read)', '~10% (90% off)'],
        ['5-min cache write', '~1.25x'],
        ['1-hour cache write', '~2x'],
        ['Non-cacheable (context+query)', 'full rate'],
      ],
    },
    links: [
      {
        label: 'Anthropic caching docs',
        url: 'https://platform.claude.com/docs/en/about-claude/pricing',
      },
    ],
    preset: { field: 'cacheTTL' },
  },
  {
    id: 'network',
    icon: 'globe',
    title: 'Network / data transfer',
    summary: "Ingress is free. Egress is tiered — and the headline $/GB isn't your real rate.",
    sections: [
      {
        h: 'Ingress vs egress',
        bullets: [
          'Uploading data IN is free on all major clouds',
          'Serving/moving data OUT (egress) is charged per GB',
          'Deliberately asymmetric to create lock-in',
        ],
      },
      {
        h: "It's tiered",
        facts: [
          { k: 'AWS', v: 'first 100 GB free, then $0.09/GB to 10 TB, $0.085 to 50 TB, $0.07 to 150 TB, $0.05 above' },
          { k: 'GCP Premium', v: '$0.12 first TB, $0.11 next 9 TB, $0.08 above' },
          { k: 'Cloudflare R2', v: '$0 egress' },
        ],
      },
      {
        h: 'Hidden ones',
        facts: [
          { k: 'NAT Gateway', v: '+$0.045/GB' },
          { k: 'Cross-AZ traffic', v: '+$0.01/GB each way' },
        ],
        bullets: ['Quietly add 50–200% on top of base egress'],
      },
    ],
    table: {
      title: 'Internet egress (first tier)',
      cols: ['Provider', '$/GB', 'Free tier'],
      rows: [
        ['AWS', '$0.09', '100 GB'],
        ['Azure', '$0.087', '100 GB'],
        ['GCP Premium', '$0.12', '—'],
        ['GCP Standard', '$0.085', '—'],
        ['Cloudflare R2', '$0.00', '—'],
        ['Oracle', '$0.0085', '10 TB'],
      ],
    },
    links: [
      { label: 'AWS data transfer', url: 'https://aws.amazon.com/ec2/pricing/on-demand/' },
      {
        label: 'Azure bandwidth',
        url: 'https://azure.microsoft.com/en-us/pricing/details/bandwidth/',
      },
      { label: 'GCP network', url: 'https://cloud.google.com/vpc/network-pricing' },
      { label: 'Cloudflare R2', url: 'https://developers.cloudflare.com/r2/pricing/' },
    ],
    preset: { field: 'cloudProvider' },
  },
  {
    id: 'labor',
    icon: 'users',
    title: 'People & observability',
    summary: 'Usually the single biggest line — and the one no calculator includes.',
    sections: [
      {
        h: 'Labor',
        facts: [{ k: 'Loaded engineer', v: '≈ $12–16k / month' }],
        bullets: [
          'Building & maintaining ingestion, evals, and infra is typically the largest cost (esp. self-hosted)',
          'Managed stacks need less ongoing ops than self-hosted',
        ],
      },
      {
        h: 'Observability & evals',
        bullets: [
          'Tracing, logging, and quality evaluation — almost always forgotten at the demo stage',
          'Tools: LangSmith, Langfuse, Arize Phoenix, Ragas (open-source evals)',
          'Budget a fixed monthly floor plus a small % of inference',
        ],
      },
    ],
    links: [],
    preset: null,
  },
  {
    id: 'glossary',
    icon: 'book',
    title: 'Glossary',
    summary: 'Quick definitions for the terms used across these topics.',
    widget: 'glossaryFilter',
    sections: [],
    table: null,
    links: [],
    preset: null,
  },
];

// ---------------------------------------------------------------------------
// Pipeline diagram (renders inside the "overview" topic)
// ---------------------------------------------------------------------------

export interface PipelineNode {
  id: string;
  label: string;
  lever: string;
  icon: IconName;
  optional?: boolean;
}

export const PIPELINE: PipelineNode[] = [
  { id: 'documents', label: 'Ingest & chunk', lever: 'tokens/page', icon: 'file-text' },
  { id: 'embeddings', label: 'Embed', lever: '$/1M + dims', icon: 'vector' },
  { id: 'vectordb', label: 'Store & retrieve', lever: '$/GB + reads', icon: 'database' },
  { id: 'reranking', label: 'Rerank', lever: '$/1k searches', icon: 'sort', optional: true },
  { id: 'generation', label: 'Generate', lever: 'in/out tokens', icon: 'cpu' },
];

export interface Overlay {
  id: string;
  label: string;
  note: string;
}

export const OVERLAYS: Overlay[] = [
  { id: 'caching', label: 'Prompt caching', note: 'cuts repeated input ~90%' },
  { id: 'network', label: 'Data transfer', note: 'egress tiered; ingress free' },
  { id: 'labor', label: 'People & observability', note: 'often the biggest line' },
];

// ---------------------------------------------------------------------------
// Glossary
// ---------------------------------------------------------------------------

export interface GlossaryEntry {
  term: string;
  def: string;
  see: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Token',
    def: 'The unit models bill on — about ¾ of a word or ~4 characters. Cost scales with tokens, not pages.',
    see: 'documents',
  },
  {
    term: 'Chunking',
    def: 'Splitting documents into smaller pieces (e.g. 256–1024 tokens) before embedding, so retrieval can return just the relevant part.',
    see: 'documents',
  },
  {
    term: 'Chunk overlap',
    def: "Repeating a slice of text between adjacent chunks (10–25%) so meaning isn't cut at boundaries. Raises token and vector counts.",
    see: 'documents',
  },
  {
    term: 'Embedding',
    def: "A vector of numbers representing a chunk's meaning. Similar meaning → nearby vectors. Billed per input token; no output tokens.",
    see: 'embeddings',
  },
  {
    term: 'Dimensions',
    def: 'How many numbers per vector (e.g. 768, 1536, 3072). More dimensions = better recall but proportionally more storage.',
    see: 'embeddings',
  },
  {
    term: 'Matryoshka',
    def: 'Embeddings you can truncate to fewer dimensions with graceful quality loss — store compact vectors, keep full ones for precision.',
    see: 'embeddings',
  },
  {
    term: 'Vector database',
    def: 'A store optimized for nearest-neighbor search over embeddings, with metadata filtering. Managed or self-hosted.',
    see: 'vectordb',
  },
  {
    term: 'ANN (approximate nearest neighbor)',
    def: "Fast 'good enough' similarity search that trades a little accuracy for big speed gains vs. exact search.",
    see: 'vectordb',
  },
  {
    term: 'HNSW',
    def: 'The common ANN index (a navigable graph). Fast and accurate, but adds ~1.5x storage overhead on top of raw vectors.',
    see: 'vectordb',
  },
  {
    term: 'Cosine similarity',
    def: "The usual score for how close two vectors are — the metric behind 'find the most similar chunks.'",
    see: 'vectordb',
  },
  {
    term: 'Quantization',
    def: 'Compressing vectors (e.g. binary quantization = up to 32–40x smaller) to cut storage/RAM, with some recall loss.',
    see: 'vectordb',
  },
  {
    term: 'Hybrid search',
    def: 'Combining keyword search (BM25) with vector search to catch both exact terms (product codes) and paraphrases.',
    see: 'vectordb',
  },
  {
    term: 'RRF (reciprocal rank fusion)',
    def: 'A simple way to merge multiple ranked lists (e.g. keyword + vector) into one candidate set before reranking.',
    see: 'reranking',
  },
  {
    term: 'Retrieval',
    def: "Fetching the most relevant chunks for a query from the vector DB — the 'R' in RAG.",
    see: 'vectordb',
  },
  {
    term: 'Top-K',
    def: 'How many retrieved chunks you keep and feed to the model as context. Higher K = more context tokens and cost.',
    see: 'generation',
  },
  {
    term: 'Candidate pool',
    def: 'The wider set (e.g. top-50/100) fetched before reranking, which then narrows to top-K. Drives rerank + read cost.',
    see: 'reranking',
  },
  {
    term: 'Bi-encoder',
    def: 'Embeds query and document separately, then compares — fast, used for first-stage retrieval, but less precise.',
    see: 'reranking',
  },
  {
    term: 'Cross-encoder',
    def: 'Reads query and document together for a precise relevance score — accurate but slower, used for reranking.',
    see: 'reranking',
  },
  {
    term: 'Reranker',
    def: 'A second-pass model that re-sorts retrieved candidates so the best chunks reach the LLM. Lifts precision ~15–40%.',
    see: 'reranking',
  },
  {
    term: 'ColBERT / late interaction',
    def: 'A retrieval style scoring token-level matches between query and document — high precision, higher storage.',
    see: 'reranking',
  },
  {
    term: 'Context window',
    def: 'The max tokens a model can take in one request (e.g. 200K–1M+). Exceeding a tier threshold can raise the price.',
    see: 'generation',
  },
  {
    term: 'Input vs output tokens',
    def: 'Input = what you send (prompt + context + query); output = what the model generates. Output usually costs 4–5x input.',
    see: 'generation',
  },
  {
    term: 'Reasoning tokens',
    def: "Hidden 'thinking' tokens some models generate before answering — billed at the output rate even though you never see them.",
    see: 'generation',
  },
  {
    term: 'Prompt caching',
    def: 'Reusing a stable prompt prefix so repeated input costs ~10% of normal. Only the fixed prefix caches, not the query.',
    see: 'caching',
  },
  {
    term: 'TTL (cache)',
    def: 'How long a cache entry lives (e.g. 5-min vs 1-hour). Longer TTL costs more to write but survives longer sessions.',
    see: 'caching',
  },
  {
    term: 'Ingestion',
    def: 'The one-time pipeline that parses, chunks, and embeds your documents into the vector store.',
    see: 'documents',
  },
  {
    term: 'Re-indexing',
    def: 'Re-embedding and re-storing vectors when your corpus changes or you switch embedding models — a recurring cost.',
    see: 'vectordb',
  },
  {
    term: 'Ingress / egress',
    def: 'Data into the cloud (ingress, free) vs. out of it (egress, charged per GB and tiered).',
    see: 'network',
  },
  {
    term: 'p99 latency / QPS',
    def: 'p99 = the slow-tail response time 99% of requests beat; QPS = queries per second the system handles.',
    see: 'vectordb',
  },
  {
    term: 'TCO',
    def: 'Total Cost of Ownership — every recurring cost of running the system over time, not just the visible API bill.',
    see: 'overview',
  },
];

// ---------------------------------------------------------------------------
// Row → Estimate value maps. A row is "selectable" iff its first cell is a key
// here. Keyed by each table's first column so a selection maps to a real
// Inputs option on the Estimate tab.
// ---------------------------------------------------------------------------

export const EMBED_ROW_MAP: Record<string, EmbedModelKey> = {
  'OpenAI text-embedding-3-small': 'te3-small',
  'OpenAI text-embedding-3-large': 'te3-large',
  'Cohere embed-v4': 'cohere-v4',
  'Voyage-4': 'voyage-4',
  'Google text-embedding-005': 'google-005',
  'Self-host BGE-M3 / E5 / nomic': 'bge-m3',
};

export const VECTORDB_ROW_MAP: Record<string, VectorDbKey> = {
  'Pinecone Serverless': 'pinecone',
  'Weaviate Cloud': 'weaviate',
  'Qdrant Cloud': 'qdrant-cloud',
  'pgvector (Supabase/Neon/RDS)': 'pgvector-rds',
  'Qdrant / Weaviate / Milvus / Chroma / pgvector / Vespa / LanceDB / FAISS': 'selfhost',
};

export const RERANK_ROW_MAP: Record<string, RerankerKey> = {
  'Cohere Rerank v3.5': 'cohere',
  'Cohere Rerank 4 Fast / Pro': 'cohere',
};

export const GEN_ROW_MAP: Record<string, GenModelKey> = {
  'GPT-5.5': 'gpt-5.5',
  'GPT-5.4': 'gpt-5.4',
  'GPT-5.4 nano': 'gpt-5.4-nano',
  'Claude Opus 4.8': 'claude-opus-4-8',
  'Claude Sonnet 4.6': 'claude-sonnet-4-6',
  'Claude Haiku 4.5': 'claude-haiku-4-5',
  'Gemini 3.1 Pro': 'gemini-3.1-pro',
  'Gemini 3.5 Flash': 'gemini-3.5-flash',
  'Gemini 3.1 Flash-Lite': 'gemini-3.1-flash-lite',
  'Open-weight (self-host GPU)': 'open-weight-gpu',
};

export const NETWORK_ROW_MAP: Record<string, CloudProviderKey> = {
  AWS: 'aws',
  Azure: 'azure',
  'GCP Premium': 'gcp',
  'GCP Standard': 'gcp-std',
  'Cloudflare R2': 'r2',
  Oracle: 'oracle',
};

/** Returns the Estimate patch for a selected table row, or null if the row
 *  doesn't map to any Estimate option (e.g. Zilliz, which the Estimate lacks). */
export function rowToPatch(topicId: string, firstCell: string): Record<string, string> | null {
  switch (topicId) {
    case 'embeddings':
      return EMBED_ROW_MAP[firstCell] ? { embedModel: EMBED_ROW_MAP[firstCell] } : null;
    case 'vectordb':
      return VECTORDB_ROW_MAP[firstCell] ? { vectorDb: VECTORDB_ROW_MAP[firstCell] } : null;
    case 'reranking':
      return RERANK_ROW_MAP[firstCell] ? { reranker: RERANK_ROW_MAP[firstCell] } : null;
    case 'generation':
      return GEN_ROW_MAP[firstCell] ? { genModel: GEN_ROW_MAP[firstCell] } : null;
    case 'network':
      return NETWORK_ROW_MAP[firstCell] ? { cloudProvider: NETWORK_ROW_MAP[firstCell] } : null;
    default:
      return null;
  }
}

/** Maps a tokens/page number to the nearest Estimate density bucket. */
export function densityBucketFor(tokens: number): 'sparse' | 'standard' | 'dense' {
  const buckets: [('sparse' | 'standard' | 'dense'), number][] = [
    ['sparse', 300],
    ['standard', 500],
    ['dense', 650],
  ];
  let best = buckets[0];
  for (const b of buckets) {
    if (Math.abs(b[1] - tokens) < Math.abs(best[1] - tokens)) best = b;
  }
  return best[0];
}

/** Sample "pages" for the tokenLab widget. `tokens` is the representative
 *  tokens/page used for the corpus embed-cost readout. */
export interface TokenSample {
  id: string;
  label: string;
  tokens: number;
  range: string;
  why: string;
}

export const TOKEN_SAMPLES: TokenSample[] = [
  {
    id: 'text',
    label: 'Text page',
    tokens: 500,
    range: '350–600',
    why: 'clean prose baseline → ~500 typical',
  },
  {
    id: 'table',
    label: 'Table-heavy page',
    tokens: 1000,
    range: '800–1,200',
    why: 'tables tokenize inefficiently → ~2x text',
  },
  {
    id: 'scanned',
    label: 'Scanned image page',
    tokens: 1290,
    range: '250–1,300',
    why: 'vision model bills a 1024px image ≈ 1,290 tokens',
  },
  {
    id: 'slide',
    label: 'Slide',
    tokens: 250,
    range: '150–350',
    why: 'little text per page',
  },
];
