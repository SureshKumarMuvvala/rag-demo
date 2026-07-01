// Client-side .xlsx proposal via SheetJS (xlsx). Consumes the shared
// ProposalModel so figures match the preview and the PDF export.
//
// Note: the SheetJS community build honors number formats (z), column widths,
// freeze panes, and formulas on write, but not cell font styling (bold). Header
// rows are therefore emphasized with number formatting + freeze rather than bold.

import * as XLSX from 'xlsx';
import type { ProposalModel } from './proposal';
import { PRICES_AS_OF } from './proposal';

const USD_FMT = '$#,##0';
const PCT_FMT = '0.0%';

type Cell = XLSX.CellObject;

function setFmt(ws: XLSX.WorkSheet, addr: string, z: string) {
  const cell = ws[addr] as Cell | undefined;
  if (cell) cell.z = z;
}

/** Bold header hint (ignored by the community build, honored by styled builds). */
function boldHeader(ws: XLSX.WorkSheet, cols: number) {
  for (let c = 0; c < cols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr] as (Cell & { s?: unknown }) | undefined;
    if (cell) cell.s = { font: { bold: true } };
  }
}

function freezeTop(ws: XLSX.WorkSheet) {
  ws['!freeze'] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: 'A2',
    activePane: 'bottomLeft',
    state: 'frozen',
  } as unknown as XLSX.WorkSheet['!freeze'];
}

/** Build the proposal workbook (pure — no download side effect). */
export function buildProposalWorkbook(model: ProposalModel): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const { costs, meta } = model;

  // ---- (a) Summary -----------------------------------------------------
  const summaryAoa: (string | number)[][] = [
    [meta.proposalTitle],
    ['Prepared for', meta.preparedFor || '—'],
    ['Prepared by', meta.preparedBy || '—'],
    ['Date', meta.date],
    ['Prices as of', `${PRICES_AS_OF} (illustrative)`],
    ['Currency', meta.currency],
    [],
    ['Monthly total', costs.total],
    ['Annual (×12)', costs.annual],
    ['One-time setup', costs.setup],
    [],
    ['Summary', model.execSummary],
  ];
  if (meta.notes.trim()) summaryAoa.push([], ['Notes', meta.notes]);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 18 }, { wch: 64 }];
  setFmt(wsSummary, 'B8', USD_FMT);
  setFmt(wsSummary, 'B9', USD_FMT);
  setFmt(wsSummary, 'B10', USD_FMT);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ---- (b) Cost Breakdown ---------------------------------------------
  const header = ['Cost bucket', '$/mo', '$/yr', '% of total', 'Custom'];
  const rows: (string | number)[][] = model.breakdown.map((r) => [
    r.label,
    r.monthly,
    r.annual,
    r.pct / 100,
    r.custom ? 'custom' : '',
  ]);
  // Only monthly-recurring lines belong in the summed column. One-time misc
  // is shown separately below the total so SUM($/mo) equals the monthly total.
  const monthlyMisc = model.misc.filter((m) => m.monthly > 0);
  const oneTimeMisc = model.misc.filter((m) => m.oneTime > 0);
  monthlyMisc.forEach((m) => {
    rows.push([
      `Misc: ${m.label}`,
      m.monthly,
      m.monthly * 12,
      m.monthly / (costs.total || 1), // fraction for 0.0% format
      '',
    ]);
  });
  const breakdownAoa: (string | number)[][] = [header, ...rows];
  const wsBreak = XLSX.utils.aoa_to_sheet(breakdownAoa);

  // Formula-driven Total row (with a cached value so SheetJS emits the formula
  // and Excel shows a number before recalculation).
  const firstDataRow = 2; // 1-based (row 1 is header)
  const lastDataRow = 1 + rows.length;
  const totalRow = lastDataRow + 1;
  XLSX.utils.sheet_add_aoa(wsBreak, [['Total (monthly recurring)']], { origin: `A${totalRow}` });
  wsBreak[`B${totalRow}`] = {
    t: 'n',
    f: `SUM(B${firstDataRow}:B${lastDataRow})`,
    v: costs.total,
    z: USD_FMT,
  };
  wsBreak[`C${totalRow}`] = {
    t: 'n',
    f: `SUM(C${firstDataRow}:C${lastDataRow})`,
    v: costs.annual,
    z: USD_FMT,
  };
  wsBreak[`D${totalRow}`] = { t: 'n', v: 1, z: PCT_FMT };

  // One-time lines below the total (excluded from the monthly sum).
  let lastRow = totalRow;
  const setupRow = totalRow + 2;
  XLSX.utils.sheet_add_aoa(wsBreak, [['One-time setup (ingestion + embedding)']], {
    origin: `A${setupRow}`,
  });
  wsBreak[`B${setupRow}`] = { t: 'n', v: costs.setup, z: USD_FMT };
  lastRow = setupRow;
  oneTimeMisc.forEach((m, i) => {
    const rr = setupRow + 1 + i;
    XLSX.utils.sheet_add_aoa(wsBreak, [[`One-time: ${m.label}`]], { origin: `A${rr}` });
    wsBreak[`B${rr}`] = { t: 'n', v: m.oneTime, z: USD_FMT };
    lastRow = rr;
  });
  wsBreak['!ref'] = `A1:E${lastRow}`;

  // Currency / percent formats on data rows.
  for (let r = firstDataRow; r <= lastDataRow; r++) {
    setFmt(wsBreak, `B${r}`, USD_FMT);
    setFmt(wsBreak, `C${r}`, USD_FMT);
    setFmt(wsBreak, `D${r}`, PCT_FMT);
  }
  wsBreak['!cols'] = [{ wch: 38 }, { wch: 14 }, { wch: 14 }, { wch: 11 }, { wch: 9 }];
  freezeTop(wsBreak);
  boldHeader(wsBreak, header.length);
  XLSX.utils.book_append_sheet(wb, wsBreak, 'Cost Breakdown');

  // ---- (c) Configuration ----------------------------------------------
  const configAoa: (string | number)[][] = [
    ['Configuration', 'Value', 'Custom'],
    ...model.config.map((c) => [c.label, c.value, c.custom ? 'custom' : '']),
  ];
  const wsConfig = XLSX.utils.aoa_to_sheet(configAoa);
  wsConfig['!cols'] = [{ wch: 22 }, { wch: 48 }, { wch: 9 }];
  freezeTop(wsConfig);
  boldHeader(wsConfig, 3);
  XLSX.utils.book_append_sheet(wb, wsConfig, 'Configuration');

  // ---- (d) Misc --------------------------------------------------------
  const miscAoa: (string | number)[][] = [['Label', 'Amount', 'Cadence']];
  if (model.misc.length === 0) {
    miscAoa.push(['(no custom line items)', '', '']);
  } else {
    model.misc.forEach((m) =>
      miscAoa.push([m.label, m.oneTime || m.monthly, m.oneTime ? 'One-time' : 'Monthly']),
    );
  }
  const wsMisc = XLSX.utils.aoa_to_sheet(miscAoa);
  for (let r = 2; r <= miscAoa.length; r++) setFmt(wsMisc, `B${r}`, USD_FMT);
  wsMisc['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 12 }];
  freezeTop(wsMisc);
  boldHeader(wsMisc, 3);
  XLSX.utils.book_append_sheet(wb, wsMisc, 'Misc');

  // ---- (e) Sources -----------------------------------------------------
  const sourcesAoa: (string | number)[][] = [
    ['Source', 'Official pricing URL'],
    ...model.sources.map((s) => [s.label, s.url]),
    [],
    ['Caveat', model.caveat],
  ];
  const wsSources = XLSX.utils.aoa_to_sheet(sourcesAoa);
  wsSources['!cols'] = [{ wch: 26 }, { wch: 60 }];
  freezeTop(wsSources);
  boldHeader(wsSources, 2);
  XLSX.utils.book_append_sheet(wb, wsSources, 'Sources');

  return wb;
}

/** Generate and trigger a client-side download of the proposal .xlsx. */
export function exportProposalXlsx(model: ProposalModel) {
  XLSX.writeFile(buildProposalWorkbook(model), `RAG-TCO-Proposal-${model.meta.date}.xlsx`);
}
