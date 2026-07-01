// Client-side branded PDF proposal via jsPDF + jspdf-autotable.
// Consumes the shared ProposalModel so figures match the preview exactly.

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProposalModel } from './proposal';
import { PRICES_AS_OF, fmtPct, fmtUSD } from './proposal';

// Brand tokens as RGB tuples.
const INK: [number, number, number] = [21, 36, 43];
const PETROL: [number, number, number] = [14, 110, 110];
const PETROL_LIGHT: [number, number, number] = [45, 160, 160];
const AMBER: [number, number, number] = [194, 121, 12];
const SOFT: [number, number, number] = [90, 107, 115];
const WHITE: [number, number, number] = [255, 255, 255];

const MARGIN = 40;
const BAND_H = 52;

/** Draw the stacked cost-tower mark (dark-theme colors, for the ink band). */
function drawMark(doc: jsPDF, x: number, y: number) {
  const w = 22;
  const sh = 4.2;
  doc.setFillColor(...PETROL_LIGHT);
  doc.roundedRect(x, y, w, sh, 1, 1, 'F');
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1.2);
  doc.setLineDashPattern([2, 1.5], 0);
  doc.line(x - 1.5, y + sh + 2.4, x + w + 1.5, y + sh + 2.4);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(79, 184, 184);
  doc.roundedRect(x, y + sh + 4.8, w, sh, 1, 1, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y + 2 * (sh + 4.8), w, sh, 1, 1, 'F');
}

/** Header band (drawn on every page). */
function drawChrome(doc: jsPDF, pageW: number) {
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, BAND_H, 'F');
  drawMark(doc, MARGIN, 12);

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RAG', MARGIN + 34, BAND_H / 2 + 4);
  doc.setFont('courier', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(230, 235, 236);
  doc.text('TCO', MARGIN + 62, BAND_H / 2 + 4);
  // amber underline under TCO
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1.4);
  doc.line(MARGIN + 62, BAND_H / 2 + 7, MARGIN + 82, BAND_H / 2 + 7);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 190, 194);
  doc.text(
    `PRICES AS OF ${PRICES_AS_OF.toUpperCase()} · ILLUSTRATIVE`,
    pageW - MARGIN,
    BAND_H / 2 + 3,
    { align: 'right' },
  );
}

function afterTableY(doc: jsPDF): number {
  // jspdf-autotable stores the last table position here.
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** Build the branded proposal PDF document (pure — no download side effect). */
export function buildProposalPdf(model: ProposalModel): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const contentTop = BAND_H + 26;

  drawChrome(doc, pageW);

  // ---- Title + meta ----------------------------------------------------
  let y = contentTop;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(model.meta.proposalTitle, MARGIN, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SOFT);
  const metaBits: string[] = [];
  if (model.meta.preparedFor) metaBits.push(`Prepared for: ${model.meta.preparedFor}`);
  if (model.meta.preparedBy) metaBits.push(`Prepared by: ${model.meta.preparedBy}`);
  metaBits.push(`Date: ${model.meta.date}`);
  doc.text(metaBits.join('    '), MARGIN, y);
  y += 12;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text(
    `Prices as of ${PRICES_AS_OF} · illustrative estimate (${model.meta.currency})`,
    MARGIN,
    y,
  );
  y += 20;

  // ---- Executive summary ----------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PETROL);
  doc.text('EXECUTIVE SUMMARY', MARGIN, y);
  y += 16;

  const cols: { label: string; value: string }[] = [
    { label: 'Monthly', value: fmtUSD(model.costs.total) },
    { label: 'Annual (×12)', value: fmtUSD(model.costs.annual) },
    { label: 'One-time setup', value: fmtUSD(model.costs.setup) },
  ];
  const colW = (pageW - 2 * MARGIN) / 3;
  cols.forEach((c, i) => {
    const cx = MARGIN + i * colW;
    doc.setFont('courier', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...INK);
    doc.text(c.value, cx, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text(c.label, cx, y + 12);
  });
  y += 30;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(model.execSummary, pageW - 2 * MARGIN), MARGIN, y);
  y += 24;

  const tableCommon = {
    margin: { left: MARGIN, right: MARGIN, top: contentTop },
    didDrawPage: () => drawChrome(doc, pageW),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4, textColor: INK },
    headStyles: { fillColor: PETROL, textColor: WHITE, fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: [242, 248, 248] as [number, number, number] },
  };

  // ---- Cost breakdown table -------------------------------------------
  if (model.meta.includeBreakdown) {
    const body = model.breakdown.map((r) => [
      r.label + (r.custom ? '  (custom)' : ''),
      fmtUSD(r.monthly),
      fmtUSD(r.annual),
      fmtPct(r.pct),
    ]);
    model.misc.forEach((m) => {
      const monthly = m.monthly;
      const annual = m.monthly * 12;
      body.push([
        `Misc: ${m.label}${m.oneTime ? ' (one-time)' : ''}`,
        m.oneTime ? fmtUSD(m.oneTime) : fmtUSD(monthly),
        m.oneTime ? '—' : fmtUSD(annual),
        '',
      ]);
    });

    autoTable(doc, {
      ...tableCommon,
      startY: y,
      head: [['Cost bucket', '$/mo', '$/yr', '% of total']],
      body,
      foot: [
        [
          'Total (monthly recurring)',
          fmtUSD(model.costs.total),
          fmtUSD(model.costs.annual),
          '100%',
        ],
      ],
      footStyles: { fillColor: INK, textColor: WHITE, fontStyle: 'bold' as const },
      columnStyles: {
        1: { halign: 'right', font: 'courier' },
        2: { halign: 'right', font: 'courier' },
        3: { halign: 'right', font: 'courier' },
      },
    });
    y = afterTableY(doc) + 10;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...AMBER);
    doc.text(
      `Waterline: ${model.belowWaterlinePct.toFixed(0)}% of monthly cost sits below the inference line.`,
      MARGIN,
      y,
    );
    y += 18;
  }

  // ---- Configuration & assumptions ------------------------------------
  if (model.meta.includeAssumptions) {
    autoTable(doc, {
      ...tableCommon,
      startY: y,
      head: [['Configuration', 'Value']],
      body: model.config.map((c) => [c.label + (c.custom ? '  (custom)' : ''), c.value]),
      columnStyles: { 1: { font: 'courier', textColor: INK } },
    });
    y = afterTableY(doc) + 14;

    if (model.meta.notes.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...PETROL);
      doc.text('NOTES & ASSUMPTIONS', MARGIN, y);
      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      const wrapped = doc.splitTextToSize(model.meta.notes, pageW - 2 * MARGIN);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * 11 + 8;
    }
  }

  // ---- Build vs Buy ----------------------------------------------------
  if (model.meta.includeBuildVsBuy && model.buildVsBuy) {
    autoTable(doc, {
      ...tableCommon,
      startY: y,
      head: [['Build vs. Buy scenario', '$/mo', '$/yr']],
      body: [
        [
          'Managed (GPT-5.4 + Pinecone)',
          fmtUSD(model.buildVsBuy.managed),
          fmtUSD(model.buildVsBuy.managed * 12),
        ],
        [
          'Self-hosted (open-weight GPU + self-host)',
          fmtUSD(model.buildVsBuy.selfhosted),
          fmtUSD(model.buildVsBuy.selfhosted * 12),
        ],
      ],
      columnStyles: {
        1: { halign: 'right', font: 'courier' },
        2: { halign: 'right', font: 'courier' },
      },
    });
    y = afterTableY(doc) + 14;
  }

  // ---- Sources & caveats ----------------------------------------------
  if (model.meta.includeSources) {
    autoTable(doc, {
      ...tableCommon,
      startY: y,
      head: [['Source', 'Official pricing URL']],
      body: model.sources.map((s) => [s.label, s.url]),
      columnStyles: { 1: { font: 'courier', fontSize: 7.5, textColor: PETROL } },
    });
    y = afterTableY(doc) + 12;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text(doc.splitTextToSize(model.caveat, pageW - 2 * MARGIN), MARGIN, y);
  }

  // ---- Footer page numbers (final pass over all pages) ----------------
  const pages = doc.internal.pages.length - 1; // pages array is 1-indexed
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(217, 224, 227);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, pageH - 30, pageW - MARGIN, pageH - 30);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SOFT);
    doc.text(`RAG · TCO — prices as of ${PRICES_AS_OF}`, MARGIN, pageH - 18);
    doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, pageH - 18, { align: 'right' });
  }

  return doc;
}

/** Generate and trigger a client-side download of the proposal PDF. */
export function exportProposalPdf(model: ProposalModel) {
  buildProposalPdf(model).save(`RAG-TCO-Proposal-${model.meta.date}.pdf`);
}
