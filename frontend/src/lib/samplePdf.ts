// Client-side generation of fictional, watermarked SAMPLE welfare PDFs (jsPDF +
// jspdf-autotable). Text profiles render selectable text; the scanned profile
// renders a single image page (no selectable text). Nothing hits a server.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  SAMPLE_FOOTER,
  SAMPLE_WATERMARK,
  buildSampleDoc,
  getProfile,
  renderScannedDataUrl,
} from './sampleDocs';
import type { SampleDoc } from './sampleDocs';

const INK: [number, number, number] = [19, 32, 41];
const PETROL: [number, number, number] = [14, 124, 123];
const SOFT: [number, number, number] = [90, 100, 108];
const MARGIN = 48;

/** Diagonal watermark + footer + page numbers on every page. */
function stampPages(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(44);
    doc.setTextColor(210, 214, 216);
    doc.text(SAMPLE_WATERMARK, pw / 2, ph / 2 + 90, { align: 'center', angle: 30 });

    doc.setDrawColor(220, 226, 228);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, ph - 34, pw - MARGIN, ph - 34);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SOFT);
    doc.text(SAMPLE_FOOTER, MARGIN, ph - 22);
    doc.text(`Page ${i} of ${pages}`, pw - MARGIN, ph - 22, { align: 'right' });
  }
}

/** Government-style header: emblem + department + title + circular/date. */
function drawHeader(doc: jsPDF, d: SampleDoc, pw: number): number {
  // Emblem placeholder (concentric rings — no non-Latin glyphs).
  doc.setDrawColor(...PETROL);
  doc.setLineWidth(1.2);
  doc.circle(pw / 2, 52, 14);
  doc.setLineWidth(0.8);
  doc.circle(pw / 2, 52, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text('GOVERNMENT OF SAMPLE STATE', pw / 2, 88, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SOFT);
  doc.text('Department of Sample Welfare', pw / 2, 102, { align: 'center' });

  doc.setDrawColor(...PETROL);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, 114, pw - MARGIN, 114);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(d.title, pw - 2 * MARGIN);
  doc.text(titleLines, pw / 2, 138, { align: 'center' });
  let y = 138 + titleLines.length * 16 + 4;

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SOFT);
  doc.text(d.circular, MARGIN, y);
  doc.text(`Date: ${d.date}`, pw - MARGIN, y, { align: 'right' });
  return y + 20;
}

function addTextBody(doc: jsPDF, d: SampleDoc, pw: number, startY: number): void {
  let y = startY;
  const width = pw - 2 * MARGIN;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const intro = doc.splitTextToSize(d.intro, width);
  doc.text(intro, MARGIN, y);
  y += intro.length * 13 + 8;

  for (const s of d.sections) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...PETROL);
    doc.text(s.heading, MARGIN, y);
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const body = doc.splitTextToSize(s.body, width);
    doc.text(body, MARGIN, y);
    y += body.length * 13 + 10;
  }

  if (d.footnotes.length) {
    doc.setDrawColor(220, 226, 228);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, MARGIN + 160, y);
    y += 12;
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SOFT);
    for (const f of d.footnotes) {
      doc.text(f, MARGIN, y);
      y += 11;
    }
  }
}

/** Build the sample PDF for a profile (pure — no download side effect). */
export function generateSamplePdf(id: string): jsPDF {
  const profile = getProfile(id);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  if (profile.kind === 'scanned') {
    // A single image page — no selectable text at all.
    const url = renderScannedDataUrl(2);
    const m = 26;
    doc.addImage(url, 'JPEG', m, m, pw - 2 * m, ph - 2 * m);
    return doc;
  }

  const d = buildSampleDoc(id);
  const y = drawHeader(doc, d, pw);

  if (profile.kind === 'table' && d.table) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const intro = doc.splitTextToSize(d.intro, pw - 2 * MARGIN);
    doc.text(intro, MARGIN, y);
    autoTable(doc, {
      startY: y + intro.length * 13 + 6,
      margin: { left: MARGIN, right: MARGIN },
      head: [d.table.head],
      body: d.table.rows,
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, textColor: INK },
      headStyles: { fillColor: PETROL, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [237, 246, 246] },
    });
    const finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    for (const s of d.sections) {
      doc.text(doc.splitTextToSize(`${s.heading}: ${s.body}`, pw - 2 * MARGIN), MARGIN, finalY);
    }
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SOFT);
    doc.text(d.footnotes.join('  '), MARGIN, ph - 48);
  } else {
    addTextBody(doc, d, pw, y);
  }

  stampPages(doc);
  return doc;
}

/** Generate + trigger a client-side download for one profile. */
export function downloadSamplePdf(id: string): void {
  generateSamplePdf(id).save(getProfile(id).filename);
}
