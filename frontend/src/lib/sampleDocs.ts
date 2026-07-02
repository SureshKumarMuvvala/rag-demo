// Procedurally-generated sample document profiles for the "Sample documents"
// tab. Everything is built in-browser — no external files. Each profile mirrors
// an Estimate avgDocSize / tokensPerPage option so the user can see which one
// matches their real docs.

import type { Inputs } from './types';

export type SampleKind = 'text' | 'table' | 'scanned';

export interface SampleProfile {
  id: string;
  name: string;
  tokensPerPageLabel: string;
  contentType: SampleKind;
  scanned: boolean;
  /** Procedurally-built preview text (plain text / markdown). */
  preview: string;
  /** What "Use this profile" writes into the shared Estimate state. */
  patch: Partial<Inputs>;
  /** Short facts shown on the card. */
  note: string;
}

const LOREM = [
  'Retrieval-augmented generation grounds a language model in your own data.',
  'At query time the system retrieves the most relevant chunks and feeds them as context.',
  'Cost scales with tokens, so the way documents are prepared matters more than their length.',
  'Clean text tokenizes efficiently; tables and scanned pages cost far more per page.',
  'Chunking splits documents into passages before embedding them into vectors.',
];

function sparseText(): string {
  return [
    'Quarterly Notes',
    '',
    '',
    'Highlights',
    '',
    '- Launch on track',
    '',
    '- Costs under budget',
    '',
    '',
    'Next steps',
    '',
    '- Ship the beta',
    '',
  ].join('\n');
}

function standardText(): string {
  const p1 = LOREM.slice(0, 3).join(' ');
  const p2 = LOREM.slice(2).join(' ');
  return `Introduction\n\n${p1}\n\n${p2}\n\nA typical page of clean prose lands around five hundred tokens — the baseline most estimates assume.`;
}

function denseText(): string {
  // Tight, long lines, no blank space — reads as ~650 tokens/page.
  const body = [...LOREM, ...LOREM].join(' ');
  return `Technical Reference. ${body} Parameters: chunk_size=512; overlap=0.10; top_k=5; embed_dim=1536; hnsw_m=16; ef_construction=200; distance=cosine. ${body}`;
}

function tableText(): string {
  return [
    '| Provider | $/1M in | $/1M out | Context |',
    '| --- | --- | --- | --- |',
    '| GPT-5.4 | 2.50 | 15.00 | 400K |',
    '| Claude Sonnet 4.6 | 3.00 | 15.00 | 500K |',
    '| Gemini 3.1 Pro | 2.00 | 12.00 | 1M |',
    '| GPT-5.4 nano | 0.20 | 1.25 | 400K |',
    '| Claude Haiku 4.5 | 1.00 | 5.00 | 200K |',
    '',
    'Tables tokenize poorly — every delimiter and cell adds tokens, so a table-heavy page runs ~800–1,200.',
  ].join('\n');
}

function scannedText(): string {
  return [
    'SCANNED INVOICE',
    'Acme Corp — No. 4837',
    'Date: 2026-06-30',
    '',
    'Item        Qty   Amount',
    'Widget A      3    $120',
    'Widget B      1     $45',
    '',
    'Total: $165',
    '(image page — no selectable text)',
  ].join('\n');
}

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    id: 'sparse',
    name: 'Sparse',
    tokensPerPageLabel: '≈300 tokens/page',
    contentType: 'text',
    scanned: false,
    preview: sparseText(),
    patch: { tokensPerPage: 'sparse' },
    note: 'Lots of whitespace, short lines — slides, forms, notes.',
  },
  {
    id: 'standard',
    name: 'Standard',
    tokensPerPageLabel: '≈500 tokens/page',
    contentType: 'text',
    scanned: false,
    preview: standardText(),
    patch: { tokensPerPage: 'standard' },
    note: 'Normal prose — the baseline most corpora sit near.',
  },
  {
    id: 'dense',
    name: 'Dense',
    tokensPerPageLabel: '≈650 tokens/page',
    contentType: 'text',
    scanned: false,
    preview: denseText(),
    patch: { tokensPerPage: 'dense' },
    note: 'Tight technical text, long lines, few breaks.',
  },
  {
    id: 'table',
    name: 'Table-heavy',
    tokensPerPageLabel: '≈800–1,200 tokens/page',
    contentType: 'table',
    scanned: false,
    preview: tableText(),
    patch: { tokensPerPage: 'custom', tokensPerPageCustom: 1000 },
    note: 'Tables tokenize poorly — plan for ~2× clean text.',
  },
  {
    id: 'scanned',
    name: 'Scanned / image',
    tokensPerPageLabel: '≈250–1,300 tokens/page (vision)',
    contentType: 'scanned',
    scanned: true,
    preview: scannedText(),
    patch: { tokensPerPage: 'custom', tokensPerPageCustom: 800 },
    note: 'Image pages billed by a vision model — convert to text to cut cost.',
  },
];

/**
 * Render a sample page's text onto a canvas to illustrate a "scanned" image page
 * (no selectable text). Returns a PNG data URL, or '' if canvas is unavailable.
 */
export function renderScannedPage(text: string): string {
  const canvas = document.createElement('canvas');
  const w = 340;
  const h = 440;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Off-white "paper" with a subtle border.
  ctx.fillStyle = '#f6f4ee';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9d4c7';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  // Faint scan noise so it reads as an image, not crisp text.
  ctx.fillStyle = 'rgba(21,36,43,0.04)';
  for (let i = 0; i < 220; i++) {
    const x = (i * 53) % w;
    const y = (i * 97) % h;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.fillStyle = '#2a2a24';
  ctx.font = '15px Georgia, serif';
  const lines = text.split('\n');
  let y = 34;
  for (const line of lines) {
    ctx.fillText(line, 24, y, w - 48);
    y += 26;
  }
  // A slight skew shadow at the bottom to feel photographed.
  ctx.fillStyle = 'rgba(21,36,43,0.06)';
  ctx.fillRect(0, h - 10, w, 10);

  return canvas.toDataURL('image/png');
}
