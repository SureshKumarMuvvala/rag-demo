// Procedurally-generated, welfare-themed SAMPLE documents for the "Sample
// documents" tab. Everything is built in-browser (no server). Each profile is
// obviously fictional and watermarked, and its body text is sized so the real
// token count lands in the profile's target band. The generated text here is the
// same text rendered into the downloadable PDF (see samplePdf.ts), so the
// measured tokens/page shown on the card matches the PDF.

import type { Inputs } from './types';

export type SampleKind = 'text' | 'table' | 'scanned';

export interface SampleProfile {
  id: string;
  name: string;
  kind: SampleKind;
  scanned: boolean;
  /** Target-band label shown on the card. */
  bandLabel: string;
  /** Representative tokens used to size text (and vision tokens for scanned). */
  targetTokens: number;
  /** Estimate patch applied by "Use this profile". */
  patch: Partial<Inputs>;
  note: string;
  filename: string;
}

export interface SampleTable {
  title: string;
  head: string[];
  rows: string[][];
}

export interface SampleDoc {
  id: string;
  kind: SampleKind;
  title: string;
  circular: string;
  date: string;
  intro: string;
  sections: { heading: string; body: string }[];
  table: SampleTable | null;
  footnotes: string[];
}

export const SAMPLE_WATERMARK = 'SAMPLE — NOT A REAL DOCUMENT';
export const SAMPLE_FOOTER = 'SAMPLE — NOT A REAL DOCUMENT · For illustration only · Confers no benefits';

// ---------------------------------------------------------------------------
// Themed content pools (obviously fictional)
// ---------------------------------------------------------------------------

const WELFARE_LINES = [
  'Eligible beneficiaries under this Sample Yojana receive a direct benefit transfer to their registered bank account.',
  'Applicants must be permanent residents of the notified sample districts and hold a valid ration card issued before the cut-off date.',
  'The scheme covers small and marginal cultivators owning up to two hectares of cultivable land as per the latest revenue records.',
  'Applications may be submitted online through the sample portal or in person at the nearest Common Service Centre.',
  'Disbursement is made in three equal installments subject to successful Aadhaar-based e-KYC verification.',
  'Field verification of the submitted documents is carried out by the designated Block Development Officer.',
  'Grievances relating to this illustrative circular may be addressed to the Sample District Welfare Officer within thirty days.',
  'This is a fictional document created only to demonstrate document token density and confers no benefits whatsoever.',
  'Households already availing a comparable central assistance are not eligible for duplicate benefit under this sample notice.',
  'The competent authority reserves the right to revise the illustrative slabs and eligibility norms without prior notice.',
];

// Welfare prose measures ~5.4 characters per BPE token; size the whole doc's
// text to targetTokens × this so the measured tokens/page lands in the band.
const CHARS_PER_TOKEN = 5.4;

/** Pad a filler body with themed lines until otherText + body ≈ targetTokens worth of chars. */
function fillerBody(otherText: string, targetTokens: number, seed: string): string {
  const targetChars = Math.round(targetTokens * CHARS_PER_TOKEN);
  let body = seed;
  let i = 0;
  while (otherText.length + body.length < targetChars && i < 1000) {
    body += (body ? ' ' : '') + WELFARE_LINES[i % WELFARE_LINES.length];
    i++;
  }
  return body;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    id: 'sparse',
    name: 'Sparse',
    kind: 'text',
    scanned: false,
    bandLabel: '≈ 300 tokens/page',
    targetTokens: 300,
    patch: { tokensPerPage: 'sparse' },
    note: 'Whitespace, short lines, big headings — a public notice / memo.',
    filename: 'sample-sparse-notice.pdf',
  },
  {
    id: 'standard',
    name: 'Standard',
    kind: 'text',
    scanned: false,
    bandLabel: '≈ 500 tokens/page',
    targetTokens: 500,
    patch: { tokensPerPage: 'standard' },
    note: 'Normal prose — a policy note. The baseline most corpora sit near.',
    filename: 'sample-standard-policy-note.pdf',
  },
  {
    id: 'dense',
    name: 'Dense',
    kind: 'text',
    scanned: false,
    bandLabel: '≈ 650 tokens/page',
    targetTokens: 650,
    patch: { tokensPerPage: 'dense' },
    note: 'Tight technical text with footnotes — a guideline / circular.',
    filename: 'sample-dense-guideline.pdf',
  },
  {
    id: 'table',
    name: 'Table-heavy',
    kind: 'table',
    scanned: false,
    bandLabel: '≈ 800–1,200 tokens/page',
    targetTokens: 1000,
    patch: { tokensPerPage: 'custom', tokensPerPageCustom: 1000 },
    note: 'Mostly tables — eligibility slabs & installment schedules. ~2× clean text.',
    filename: 'sample-table-benefit-slabs.pdf',
  },
  {
    id: 'scanned',
    name: 'Scanned / image',
    kind: 'scanned',
    scanned: true,
    bandLabel: 'vision-billed ≈ 800 tokens/page',
    targetTokens: 800,
    patch: { tokensPerPage: 'custom', tokensPerPageCustom: 800 },
    note: 'An image page (no selectable text) — billed by a vision model.',
    filename: 'sample-scanned-circular.pdf',
  },
];

export function getProfile(id: string): SampleProfile {
  return SAMPLE_PROFILES.find((p) => p.id === id) ?? SAMPLE_PROFILES[0];
}

// ---------------------------------------------------------------------------
// Document builders (welfare-themed, token-sized)
// ---------------------------------------------------------------------------

export function buildSampleDoc(id: string): SampleDoc {
  switch (id) {
    case 'sparse':
      return sparseDoc();
    case 'standard':
      return standardDoc();
    case 'dense':
      return denseDoc();
    case 'table':
      return tableDoc();
    default:
      return scannedDoc();
  }
}

function sparseDoc(): SampleDoc {
  const title = 'Sample Welfare Scheme — XYZ Yojana';
  const circular = 'Public Notice No. SAMPLE/2026/001';
  const date = '15 March 2026';
  const intro = 'Public notice — for illustration only.';
  const fixed = [title, circular, date, intro, 'PURPOSE', 'Financial assistance to eligible sample households.',
    'WHO CAN APPLY', 'HOW TO APPLY', 'Online at the sample portal or at the nearest Common Service Centre.',
    'LAST DATE', '30 April 2026 (sample).', 'For illustration only. XYZ Yojana is fictional.'].join(' ');
  return {
    id: 'sparse',
    kind: 'text',
    title,
    circular,
    date,
    intro,
    sections: [
      { heading: 'PURPOSE', body: 'Financial assistance to eligible sample households.' },
      {
        heading: 'WHO CAN APPLY',
        body: fillerBody(fixed, 300, 'Residents of the notified sample districts holding a valid ration card.'),
      },
      { heading: 'HOW TO APPLY', body: 'Online at the sample portal or at the nearest Common Service Centre.' },
      { heading: 'LAST DATE', body: '30 April 2026 (sample).' },
    ],
    table: null,
    footnotes: ['For illustration only. XYZ Yojana is fictional.'],
  };
}

function standardDoc(): SampleDoc {
  const title = 'Sample Welfare Scheme — Kisan Samman Sample Yojana';
  const circular = 'Circular No. SAMPLE/2026/017';
  const date = '02 April 2026';
  const intro =
    'This illustrative policy note describes the eligibility, benefits and application process of a fictional welfare scheme, created solely to demonstrate document token density.';
  const benefits =
    'Eligible beneficiaries receive ₹6,000 per year in three equal installments of ₹2,000 through direct benefit transfer.';
  const application =
    'Applications are submitted online with Aadhaar-based e-KYC; field verification is completed within thirty working days.';
  const footnote = 'For illustration only. All names, numbers and amounts are fictional.';
  const fixed = [title, circular, date, intro, 'Eligibility', 'Benefits', benefits, 'Application process', application, footnote].join(' ');
  return {
    id: 'standard',
    kind: 'text',
    title,
    circular,
    date,
    intro,
    sections: [
      {
        heading: 'Eligibility',
        body: fillerBody(fixed, 500, 'Small and marginal cultivators with landholding up to two hectares are eligible under this sample scheme.'),
      },
      { heading: 'Benefits', body: benefits },
      { heading: 'Application process', body: application },
    ],
    table: null,
    footnotes: [footnote],
  };
}

function denseDoc(): SampleDoc {
  const title = 'Sample Operational Guideline — Balika Shiksha Sample Yojana';
  const circular = 'Guideline No. SAMPLE/2026/GL-04';
  const date = '20 April 2026';
  const intro =
    'These fictional operational guidelines consolidate the eligibility matrix, verification protocol, disbursement schedule and grievance-redressal mechanism for a sample welfare scheme, and are issued strictly for token-density illustration.';
  const verify =
    'Documentary verification is undertaken in two stages by the Block Development Officer and the District Welfare Officer, and any discrepancy is escalated within seven working days.';
  const disburse =
    'Installments are released only after successful e-KYC; failed transfers are re-attempted once and thereafter flagged for manual reconciliation.';
  const notes = [
    '¹ Illustrative figures; no legal or financial validity.',
    '² All identifiers (SAMPLE/2026/GL-04) are fictional.',
    '³ Prepared only to demonstrate a dense, technical page.',
  ];
  const fixed = [title, circular, date, intro, '1. Scope and definitions', '2. Verification protocol', verify,
    '3. Disbursement and reconciliation', disburse, ...notes].join(' ');
  return {
    id: 'dense',
    kind: 'text',
    title,
    circular,
    date,
    intro,
    sections: [
      {
        heading: '1. Scope and definitions',
        body: fillerBody(fixed, 650, 'For the purposes of this sample guideline, a "beneficiary" means an eligible resident enrolled under the notified sample scheme, and an "installment" means a periodic direct benefit transfer.'),
      },
      { heading: '2. Verification protocol', body: verify },
      { heading: '3. Disbursement and reconciliation', body: disburse },
    ],
    table: null,
    footnotes: notes,
  };
}

function tableDoc(): SampleDoc {
  const title = 'Sample Benefit Schedule — Awas Sample Yojana';
  const circular = 'Annexure No. SAMPLE/2026/AN-09';
  const date = '28 April 2026';
  const intro =
    'The following fictional slabs illustrate income-based eligibility, sanctioned assistance and installment release under a sample housing scheme (for illustration only).';
  const table: SampleTable = {
    title: 'Income slabs, sanctioned assistance and installment schedule (illustrative)',
    head: ['Category', 'Annual income (₹)', 'Sanctioned (₹)', 'Instalment 1', 'Instalment 2', 'Instalment 3', 'Milestone'],
    rows: [
      ['EWS-A', 'up to 60,000', '1,20,000', '40,000', '40,000', '40,000', 'Foundation / Plinth / Roof'],
      ['EWS-B', '60,001 – 90,000', '1,00,000', '40,000', '35,000', '25,000', 'Foundation / Plinth / Roof'],
      ['LIG-A', '90,001 – 1,20,000', '80,000', '30,000', '30,000', '20,000', 'Foundation / Plinth / Roof'],
      ['LIG-B', '1,20,001 – 1,80,000', '60,000', '25,000', '20,000', '15,000', 'Foundation / Plinth / Roof'],
      ['MIG-A', '1,80,001 – 3,00,000', '40,000', '20,000', '12,000', '8,000', 'Plinth / Roof'],
      ['MIG-B', '3,00,001 – 6,00,000', '25,000', '15,000', '6,000', '4,000', 'Roof'],
      ['SC/ST top-up', 'as per category', '20,000', '10,000', '6,000', '4,000', 'On completion of works'],
      ['Divyang top-up', 'as per category', '15,000', '8,000', '4,000', '3,000', 'On completion of works'],
      ['Widow top-up', 'as per category', '18,000', '9,000', '5,000', '4,000', 'On completion of works'],
      ['Landless top-up', 'as per category', '22,000', '11,000', '7,000', '4,000', 'On completion of works'],
      ['Hilly area add-on', 'up to 1,80,000', '30,000', '12,000', '10,000', '8,000', 'Foundation / Plinth / Roof'],
      ['Aspirational block', 'up to 1,80,000', '35,000', '15,000', '12,000', '8,000', 'Foundation / Plinth / Roof'],
    ],
  };
  const tableText = [table.title, table.head.join(' '), ...table.rows.map((r) => r.join(' '))].join(' ');
  const fixed = [title, circular, date, intro, 'Notes', tableText,
    'For illustration only. Awas Sample Yojana, categories and amounts are fictional.'].join(' ');
  return {
    id: 'table',
    kind: 'table',
    title,
    circular,
    date,
    intro,
    sections: [
      {
        heading: 'Notes',
        body: fillerBody(fixed, 840, 'Assistance is released in installments against verified construction milestones; the amounts above are illustrative and non-binding.'),
      },
    ],
    table,
    footnotes: ['For illustration only. Awas Sample Yojana, categories and amounts are fictional.'],
  };
}

function scannedDoc(): SampleDoc {
  const title = 'Sample Circular — Vridha Pension Sample Yojana';
  const circular = 'Circular No. SAMPLE/2026/000';
  const date = '10 April 2026';
  return {
    id: 'scanned',
    kind: 'scanned',
    title,
    circular,
    date,
    intro: 'Office of the Sample District Collector — Welfare Division',
    sections: [
      { heading: 'Subject', body: 'Enhancement of monthly pension under the sample old-age assistance scheme.' },
      { heading: 'Order', body: 'The monthly pension is revised to ₹1,000 for eligible sample beneficiaries with effect from the next quarter, subject to annual life-certificate verification.' },
    ],
    table: null,
    footnotes: ['SAMPLE — NOT A REAL DOCUMENT', 'Scanned image page — no selectable text.'],
  };
}

/** Flatten a doc to the exact plain text rendered into the PDF (for token measurement). */
export function sampleDocText(doc: SampleDoc): string {
  const parts: string[] = [doc.title, doc.circular, doc.date, doc.intro];
  for (const s of doc.sections) parts.push(s.heading, s.body);
  if (doc.table) {
    parts.push(doc.table.title, doc.table.head.join(' '));
    for (const row of doc.table.rows) parts.push(row.join(' '));
  }
  parts.push(...doc.footnotes);
  return parts.filter(Boolean).join('\n');
}

/** Short preview snippet for the on-screen card. */
export function samplePreview(doc: SampleDoc): string {
  const lines = [`${doc.title}`, `${doc.circular} · ${doc.date}`, '', doc.intro];
  if (doc.table) {
    lines.push('', doc.table.head.join('  |  '));
    for (const r of doc.table.rows.slice(0, 4)) lines.push(r.join('  |  '));
    lines.push('…');
  } else {
    for (const s of doc.sections) lines.push('', s.heading, s.body);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Scanned page — rendered to a canvas (image, no selectable text)
// ---------------------------------------------------------------------------

/**
 * Render a fictional scanned circular to a canvas: grayscale, slight rotation,
 * paper texture / noise and a faded "SAMPLE" stamp. Returns a JPEG data URL.
 */
export function renderScannedDataUrl(scale = 1): string {
  const w = Math.round(620 * scale);
  const h = Math.round(840 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const doc = scannedDoc();
  const s = (n: number) => n * scale;

  // Grayish paper.
  ctx.fillStyle = '#ecebe6';
  ctx.fillRect(0, 0, w, h);

  // Paper texture / scan noise.
  for (let i = 0; i < 2600; i++) {
    const x = (i * 61) % w;
    const y = (i * 137) % h;
    const g = 200 + ((i * 7) % 40);
    ctx.fillStyle = `rgba(${g},${g},${g - 6},0.10)`;
    ctx.fillRect(x, y, 1, 1);
  }
  // Darker edges (photocopy vignette).
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(40,40,36,0.06)');
  grad.addColorStop(0.5, 'rgba(40,40,36,0)');
  grad.addColorStop(1, 'rgba(40,40,36,0.08)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Slight rotation so it reads "photographed".
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-1.4 * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  ctx.fillStyle = '#2b2b28';
  ctx.textAlign = 'center';
  ctx.font = `bold ${s(22)}px Georgia, serif`;
  ctx.fillText('GOVERNMENT OF SAMPLE STATE', w / 2, s(70));
  ctx.font = `${s(15)}px Georgia, serif`;
  ctx.fillText(doc.intro, w / 2, s(96));

  ctx.textAlign = 'left';
  ctx.font = `bold ${s(18)}px Georgia, serif`;
  ctx.fillText(doc.title, s(56), s(150));
  ctx.font = `${s(14)}px Georgia, serif`;
  ctx.fillStyle = '#3a3a35';
  ctx.fillText(`${doc.circular}`, s(56), s(176));
  ctx.fillText(`Date: ${doc.date}`, s(56), s(198));

  let y = s(244);
  ctx.fillStyle = '#2b2b28';
  for (const sec of doc.sections) {
    ctx.font = `bold ${s(15)}px Georgia, serif`;
    ctx.fillText(`${sec.heading}:`, s(56), y);
    y += s(24);
    ctx.font = `${s(14)}px Georgia, serif`;
    for (const line of wrapText(ctx, sec.body, w - s(112))) {
      ctx.fillText(line, s(56), y);
      y += s(22);
    }
    y += s(14);
  }

  // Signature block.
  ctx.font = `${s(14)}px Georgia, serif`;
  ctx.fillText('Sd/-', w - s(200), y + s(24));
  ctx.fillText('Sample District Collector', w - s(200), y + s(46));
  ctx.restore();

  // Faded round "SAMPLE" stamp (grayscale), rotated.
  ctx.save();
  ctx.translate(w * 0.7, h * 0.72);
  ctx.rotate((-16 * Math.PI) / 180);
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = '#5b5b55';
  ctx.lineWidth = s(3);
  ctx.beginPath();
  ctx.arc(0, 0, s(66), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, s(56), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#5b5b55';
  ctx.textAlign = 'center';
  ctx.font = `bold ${s(20)}px Georgia, serif`;
  ctx.fillText('SAMPLE', 0, s(2));
  ctx.font = `${s(9)}px Georgia, serif`;
  ctx.fillText('NOT VALID', 0, s(18));
  ctx.restore();

  // Footer watermark baked into the image.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#4a4a44';
  ctx.textAlign = 'center';
  ctx.font = `${s(11)}px Georgia, serif`;
  ctx.fillText(SAMPLE_WATERMARK, w / 2, h - s(24));
  ctx.globalAlpha = 1;

  return canvas.toDataURL('image/jpeg', 0.82);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
