// Client-side document analysis for the "Understand my documents" feature.
//
// PRIVACY: everything here runs in the browser. Files are read via the File API
// for in-memory analysis only — never uploaded, stored, or sent anywhere. The
// heavy parsers (pdf.js, mammoth) and the tokenizer are dynamically imported so
// they load only when the user actually analyzes a file.

import type { DensityKey, DocSizeKey, Inputs } from './types';
import { DOC_SIZE_PAGES } from './rates';

export type DocType = 'txt' | 'md' | 'pdf' | 'docx';
export type ContentType = 'text' | 'table-heavy' | 'scanned';

export interface DocAnalysis {
  name: string;
  type: DocType;
  sizeBytes: number;
  /** Real (pdf) or estimated (docx/text) page count. */
  pages: number;
  /** Extracted character count. */
  chars: number;
  /** Approximate token count (BPE where possible). */
  tokens: number;
  /** True when a PDF had little/no extractable text (scanned/image). */
  scanned: boolean;
  contentType: ContentType;
  tokensPerPage: number;
  /** Estimated chunks at 512-token chunks + 10% overlap. */
  chunks: number;
  /** Estimated vectors (one per chunk). */
  vectors: number;
}

export const ACCEPTED_EXTS = ['.txt', '.md', '.pdf', '.docx'] as const;
export const ACCEPT_ATTR = ACCEPTED_EXTS.join(',');
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

// Estimation constants (all approximate; labelled as such in the UI).
const CHARS_PER_PAGE = 1_800; // a rough printed page of prose
const CHARS_PER_TOKEN = 4; // fallback when BPE is unavailable
const SCANNED_TOKENS_PER_PAGE = 800; // vision default (Explore token rules: ~250–1,300)
const CHUNK_TOKENS = 512;
const CHUNK_OVERLAP = 0.1;
const TABLE_HEAVY_TPP = 750; // tokens/page above this reads as table-heavy

/** Thrown for user-facing validation/read errors (shown verbatim). */
export class AnalyzeError extends Error {}

export function extOf(name: string): DocType | null {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  const ext = m ? m[1].toLowerCase() : '';
  if (ext === 'txt') return 'txt';
  if (ext === 'md' || ext === 'markdown') return 'md';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function countTokens(text: string): Promise<number> {
  if (!text) return 0;
  try {
    const { encode } = await import('gpt-tokenizer');
    return encode(text).length;
  } catch {
    return Math.round(text.length / CHARS_PER_TOKEN);
  }
}

async function readPdf(
  buffer: ArrayBuffer,
): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist');
  // Bundled worker (Vite resolves `?url` to an asset URL).
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: buffer }).promise;
  } catch {
    throw new AnalyzeError('Could not read this PDF — it may be encrypted or corrupted.');
  }
  const pages = doc.numPages;
  let text = '';
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ');
    text += '\n';
  }
  return { text, pages };
}

async function readDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = (await import('mammoth')).default;
  try {
    const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
    return value;
  } catch {
    throw new AnalyzeError('Could not read this .docx file — it may be corrupted.');
  }
}

/** Analyze one file entirely in-browser. Throws AnalyzeError with a friendly message. */
export async function analyzeFile(file: File): Promise<DocAnalysis> {
  const type = extOf(file.name);
  if (!type) {
    throw new AnalyzeError(
      `Unsupported file "${file.name}". Supported: ${ACCEPTED_EXTS.join(', ')}.`,
    );
  }
  if (file.size === 0) throw new AnalyzeError(`"${file.name}" is empty.`);
  if (file.size > MAX_FILE_BYTES) {
    throw new AnalyzeError(
      `"${file.name}" is ${formatBytes(file.size)} — over the ${formatBytes(MAX_FILE_BYTES)} limit.`,
    );
  }

  let text = '';
  let pages = 0;
  let scanned = false;

  if (type === 'txt' || type === 'md') {
    text = await file.text();
    pages = Math.max(1, Math.round(text.length / CHARS_PER_PAGE));
  } else if (type === 'pdf') {
    const buffer = await file.arrayBuffer();
    const res = await readPdf(buffer);
    pages = Math.max(1, res.pages);
    text = res.text;
    // Little/no extractable text across the pages → treat as scanned/image.
    scanned = text.trim().length < pages * 20;
  } else {
    const buffer = await file.arrayBuffer();
    text = await readDocx(buffer);
    pages = Math.max(1, Math.round(text.length / CHARS_PER_PAGE));
  }

  const chars = text.length;
  let tokens: number;
  if (scanned) {
    tokens = pages * SCANNED_TOKENS_PER_PAGE;
  } else {
    tokens = await countTokens(text);
  }

  const tokensPerPage = pages > 0 ? Math.round(tokens / pages) : tokens;
  const contentType: ContentType = scanned
    ? 'scanned'
    : tokensPerPage > TABLE_HEAVY_TPP
      ? 'table-heavy'
      : 'text';
  const chunks = Math.max(0, Math.ceil((tokens * (1 + CHUNK_OVERLAP)) / CHUNK_TOKENS));

  return {
    name: file.name,
    type,
    sizeBytes: file.size,
    pages,
    chars,
    tokens,
    scanned,
    contentType,
    tokensPerPage,
    chunks,
    vectors: chunks,
  };
}

// ---------------------------------------------------------------------------
// Aggregation + Estimate-input suggestions
// ---------------------------------------------------------------------------

export interface Aggregate {
  count: number;
  totalTokens: number;
  totalChunks: number;
  totalVectors: number;
  avgPages: number;
  /** Corpus-weighted tokens per page (Σtokens / Σpages). */
  tokensPerPage: number;
  anyScanned: boolean;
}

export function aggregate(docs: DocAnalysis[]): Aggregate | null {
  if (docs.length === 0) return null;
  const totalTokens = docs.reduce((s, d) => s + d.tokens, 0);
  const totalPages = docs.reduce((s, d) => s + d.pages, 0);
  return {
    count: docs.length,
    totalTokens,
    totalChunks: docs.reduce((s, d) => s + d.chunks, 0),
    totalVectors: docs.reduce((s, d) => s + d.vectors, 0),
    avgPages: totalPages / docs.length,
    tokensPerPage: totalPages > 0 ? Math.round(totalTokens / totalPages) : 0,
    anyScanned: docs.some((d) => d.scanned),
  };
}

/** Nearest named avg-doc-size bucket, or a custom page count when far off. */
export function suggestDocSize(avgPages: number): {
  key: DocSizeKey;
  custom?: number;
} {
  const entries = Object.entries(DOC_SIZE_PAGES) as [DocSizeKey, number][];
  let best = entries[0];
  for (const e of entries) {
    if (Math.abs(e[1] - avgPages) < Math.abs(best[1] - avgPages)) best = e;
  }
  const rounded = Math.max(1, Math.round(avgPages));
  if (Math.abs(best[1] - avgPages) / avgPages <= 0.4) return { key: best[0] };
  return { key: 'custom', custom: rounded };
}

export interface Suggestion {
  documents: number;
  docSize: { key: DocSizeKey; custom?: number };
  tokensPerPage: number; // exact (saved as a custom density)
  density: DensityKey; // nearest named bucket (for display)
  chunkSize: '512';
  chunkOverlap: '0.10';
}

/** Nearest named tokens/page density bucket, for the "suggested" display label. */
function nearestDensity(tpp: number): DensityKey {
  const buckets: [DensityKey, number][] = [
    ['sparse', 300],
    ['standard', 500],
    ['dense', 650],
  ];
  let best = buckets[0];
  for (const b of buckets) {
    if (Math.abs(b[1] - tpp) < Math.abs(best[1] - tpp)) best = b;
  }
  return best[0];
}

export function deriveSuggestion(agg: Aggregate, documents: number): Suggestion {
  return {
    documents,
    docSize: suggestDocSize(agg.avgPages),
    tokensPerPage: agg.tokensPerPage,
    density: nearestDensity(agg.tokensPerPage),
    chunkSize: '512',
    chunkOverlap: '0.10',
  };
}

/** Build the shared-state patch a suggestion saves into the Estimate. */
export function suggestionToPatch(s: Suggestion): Partial<Inputs> {
  const patch: Partial<Inputs> = {
    documents: Math.max(0, Math.round(s.documents)),
    tokensPerPage: 'custom',
    tokensPerPageCustom: Math.max(1, Math.round(s.tokensPerPage)),
    avgDocSizePages: s.docSize.key,
  };
  if (s.docSize.key === 'custom' && s.docSize.custom != null) {
    patch.avgDocSizePagesCustom = s.docSize.custom;
  }
  return patch;
}
