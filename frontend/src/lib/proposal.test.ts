import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as XLSX from 'xlsx';
import { DEFAULT_INPUTS } from './types';
import type { Inputs, MiscItem, Overrides } from './types';
import {
  buildProposalModel,
  defaultProposalMeta,
  proposalPlainText,
  PROPOSAL_BUCKETS,
} from './proposal';
import { buildProposalPdf } from './exportPdf';
import { buildProposalWorkbook } from './exportXlsx';

const META = defaultProposalMeta('2026-07-01');

// A representative non-default estimate: custom gen rate + a misc line.
const OVERRIDES: Overrides = { genModel: { in: 4, out: 20 }, buckets: { labor: 5000 } };
const MISC: MiscItem[] = [
  { id: 'a', label: 'Security review', amount: 800, cadence: 'monthly' },
  { id: 'b', label: 'Compliance audit', amount: 12000, cadence: 'oneTime' },
];

describe('proposal model', () => {
  it('has all nine buckets, totals, sources, and a matching plain-text summary', () => {
    const model = buildProposalModel(DEFAULT_INPUTS, OVERRIDES, MISC, META);
    expect(model.breakdown).toHaveLength(PROPOSAL_BUCKETS.length);
    expect(model.costs.total).toBeGreaterThan(0);
    expect(model.sources.length).toBeGreaterThan(0);

    // Custom flags surface on the overridden buckets.
    const inference = model.breakdown.find((b) => b.key === 'inference');
    const labor = model.breakdown.find((b) => b.key === 'labor');
    expect(inference?.custom).toBe(true); // genModel override
    expect(labor?.custom).toBe(true); // flat bucket pin
    expect(labor?.monthly).toBe(5000); // pin value flows through

    // Misc flows in.
    expect(model.misc).toHaveLength(2);
    const text = proposalPlainText(model);
    expect(text).toContain(META.proposalTitle);
    expect(text).toContain('COST BREAKDOWN');
  });

  it('flags default estimates via isDefault', () => {
    const dflt = buildProposalModel(DEFAULT_INPUTS, {}, [], META);
    expect(dflt.isDefault).toBe(true);
    const custom = buildProposalModel(DEFAULT_INPUTS, OVERRIDES, MISC, META);
    expect(custom.isDefault).toBe(false);
  });
});

describe('exporters produce non-empty documents', () => {
  const model = buildProposalModel(DEFAULT_INPUTS, OVERRIDES, MISC, META);
  const outDir = join(tmpdir(), 'rag-tco-samples');
  try {
    mkdirSync(outDir, { recursive: true });
  } catch {
    /* ignore */
  }

  it('builds a PDF document', () => {
    const doc = buildProposalPdf(model);
    const buf = doc.output('arraybuffer');
    expect(buf.byteLength).toBeGreaterThan(1000);
    writeFileSync(join(outDir, 'RAG-TCO-Proposal-sample.pdf'), Buffer.from(buf));
  });

  it('builds an XLSX workbook with all five sheets', () => {
    const wb = buildProposalWorkbook(model);
    expect(wb.SheetNames).toEqual([
      'Summary',
      'Cost Breakdown',
      'Configuration',
      'Misc',
      'Sources',
    ]);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    expect(buf.length).toBeGreaterThan(1000);
    writeFileSync(join(outDir, 'RAG-TCO-Proposal-sample.xlsx'), buf);
    // eslint-disable-next-line no-console
    console.log(`\nSample exports written to: ${outDir}`);
  });
});

// Keep the Inputs import meaningful for future extension.
export type _Inputs = Inputs;
