import { useMemo, useState } from 'react';
import type { Inputs, MiscItem, Overrides } from '../lib/types';
import {
  PRICES_AS_OF,
  buildProposalModel,
  fmtPct,
  fmtUSD,
  proposalPlainText,
} from '../lib/proposal';
import type { ProposalMeta } from '../lib/proposal';
import { exportProposalPdf } from '../lib/exportPdf';
import { exportProposalXlsx } from '../lib/exportXlsx';
import Logo from './Logo';
import Icon from './Icon';

interface TabProposeProps {
  inputs: Inputs;
  overrides: Overrides;
  misc: MiscItem[];
  meta: ProposalMeta;
  onMetaChange: (patch: Partial<ProposalMeta>) => void;
}

export default function TabPropose({
  inputs,
  overrides,
  misc,
  meta,
  onMetaChange,
}: TabProposeProps) {
  const model = useMemo(
    () => buildProposalModel(inputs, overrides, misc, meta),
    [inputs, overrides, misc, meta],
  );
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(proposalPlainText(model));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 wide:grid-cols-[minmax(0,1fr)_320px]">
      {/* Preview */}
      <div className="order-2 wide:order-1">
        <ProposalPreview model={model} />
      </div>

      {/* Metadata + exports */}
      <aside className="order-1 flex flex-col gap-4 wide:order-2">
        <div className="rounded-2xl border border-borders bg-surfaces p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold text-ink">Proposal details</h2>
          {model.isDefault && (
            <p className="mt-2 rounded-lg bg-tinted-surface px-3 py-2 font-body text-[12px] text-ink/70">
              Configure your estimate first for a tailored proposal.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            <Field label="Proposal title">
              <input
                type="text"
                value={meta.proposalTitle}
                onChange={(e) => onMetaChange({ proposalTitle: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prepared for">
                <input
                  type="text"
                  value={meta.preparedFor}
                  placeholder="Client / stakeholder"
                  onChange={(e) => onMetaChange({ preparedFor: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Prepared by">
                <input
                  type="text"
                  value={meta.preparedBy}
                  placeholder="Author / team"
                  onChange={(e) => onMetaChange({ preparedBy: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  value={meta.date}
                  onChange={(e) => onMetaChange({ date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Currency label">
                <input
                  type="text"
                  value={meta.currency}
                  onChange={(e) => onMetaChange({ currency: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Notes / assumptions">
              <textarea
                rows={3}
                value={meta.notes}
                placeholder="Optional caveats, scope, or assumptions…"
                onChange={(e) => onMetaChange({ notes: e.target.value })}
                className={`${inputCls} resize-y`}
              />
            </Field>

            <fieldset className="mt-1">
              <legend className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-petrol">
                Optional sections
              </legend>
              <div className="flex flex-col gap-1.5">
                <SectionToggle
                  label="Build vs. Buy"
                  checked={meta.includeBuildVsBuy}
                  onChange={(v) => onMetaChange({ includeBuildVsBuy: v })}
                />
                <SectionToggle
                  label="Cost breakdown"
                  checked={meta.includeBreakdown}
                  onChange={(v) => onMetaChange({ includeBreakdown: v })}
                />
                <SectionToggle
                  label="Configuration & assumptions"
                  checked={meta.includeAssumptions}
                  onChange={(v) => onMetaChange({ includeAssumptions: v })}
                />
                <SectionToggle
                  label="Sources & caveats"
                  checked={meta.includeSources}
                  onChange={(v) => onMetaChange({ includeSources: v })}
                />
              </div>
            </fieldset>
          </div>
        </div>

        {/* Export actions */}
        <div className="rounded-2xl border border-borders bg-surfaces p-5 shadow-card">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-petrol">Export</h3>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => exportProposalPdf(model)}
              className="flex items-center justify-center gap-2 rounded-xl bg-petrol px-4 py-2.5 font-display text-sm font-medium text-white shadow-sm transition-colors hover:bg-petrol-light focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-surfaces"
            >
              <Icon name="download" className="h-4 w-4" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => exportProposalXlsx(model)}
              className="flex items-center justify-center gap-2 rounded-xl border border-petrol bg-surfaces px-4 py-2.5 font-display text-sm font-medium text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
            >
              <Icon name="download" className="h-4 w-4" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={copySummary}
              className="flex items-center justify-center gap-2 rounded-xl border border-borders bg-surfaces px-4 py-2.5 font-display text-sm font-medium text-ink transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
            >
              {copied ? '✓ Copied' : 'Copy summary'}
            </button>
          </div>
          <p className="mt-3 font-mono text-[10px] text-ink/50">
            Files download in-browser · RAG-TCO-Proposal-{meta.date}
          </p>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// On-screen preview (styled like the export)
// ---------------------------------------------------------------------------

function ProposalPreview({ model }: { model: ReturnType<typeof buildProposalModel> }) {
  const { meta, costs } = model;
  return (
    <article className="overflow-hidden rounded-2xl border border-borders bg-surfaces shadow-card">
      {/* 1. Header band */}
      <div className="flex items-center justify-between gap-4 bg-ink px-6 py-4">
        <div className="flex items-center gap-3">
          <Logo variant="mark" theme="dark" markSize={34} />
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              {meta.proposalTitle}
            </h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-white/60">
              Prices as of {PRICES_AS_OF} · illustrative estimate
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-[10px] text-white/70">
          {meta.preparedFor && <div>For: {meta.preparedFor}</div>}
          {meta.preparedBy && <div>By: {meta.preparedBy}</div>}
          <div>{meta.date}</div>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        {/* 2. Executive summary */}
        <section>
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-petrol">
            Executive summary
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <BigStat label="Monthly" value={fmtUSD(costs.total)} />
            <BigStat label="Annual (×12)" value={fmtUSD(costs.annual)} />
            <BigStat label="One-time setup" value={fmtUSD(costs.setup)} />
          </div>
          <p className="mt-3 font-body text-sm text-ink/75">{model.execSummary}</p>
        </section>

        {/* 3. Cost breakdown */}
        {meta.includeBreakdown && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-petrol">
              Cost breakdown
            </h3>
            <PreviewTable
              head={['Cost bucket', '$/mo', '$/yr', '% of total']}
              rows={[
                ...model.breakdown.map((r) => [
                  r.label + (r.custom ? '  ·custom' : ''),
                  fmtUSD(r.monthly),
                  fmtUSD(r.annual),
                  fmtPct(r.pct),
                ]),
                ...model.misc.map((m) => [
                  `Misc: ${m.label}${m.oneTime ? ' (one-time)' : ''}`,
                  m.oneTime ? fmtUSD(m.oneTime) : fmtUSD(m.monthly),
                  m.oneTime ? '—' : fmtUSD(m.monthly * 12),
                  '',
                ]),
              ]}
              foot={['Total (monthly)', fmtUSD(costs.total), fmtUSD(costs.annual), '100%']}
              numCols={[1, 2, 3]}
            />
            <p className="mt-2 font-mono text-[11px] text-amber">
              Waterline: {model.belowWaterlinePct.toFixed(0)}% of monthly cost sits below the
              inference line.
            </p>
          </section>
        )}

        {/* 4. Configuration & assumptions */}
        {meta.includeAssumptions && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-petrol">
              Configuration &amp; assumptions
            </h3>
            <PreviewTable
              head={['Configuration', 'Value']}
              rows={model.config.map((c) => [c.label + (c.custom ? '  ·custom' : ''), c.value])}
              numCols={[]}
            />
            {meta.notes.trim() && (
              <p className="mt-2 whitespace-pre-wrap font-body text-[13px] text-ink/70">
                {meta.notes}
              </p>
            )}
          </section>
        )}

        {/* 5. Build vs Buy */}
        {meta.includeBuildVsBuy && model.buildVsBuy && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-petrol">
              Build vs. Buy
            </h3>
            <PreviewTable
              head={['Scenario', '$/mo', '$/yr']}
              rows={[
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
              ]}
              numCols={[1, 2]}
            />
          </section>
        )}

        {/* 6. Sources & caveats */}
        {meta.includeSources && (
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-petrol">
              Sources &amp; caveats
            </h3>
            <ul className="flex flex-col gap-1">
              {model.sources.map((s) => (
                <li key={s.url} className="flex items-baseline justify-between gap-3">
                  <span className="font-body text-[13px] text-ink/75">{s.label}</span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-[11px] text-petrol hover:underline"
                  >
                    {s.url}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-body text-[12px] italic text-ink/55">{model.caveat}</p>
          </section>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Small bits
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-lg border border-borders bg-surfaces px-2.5 py-1.5 font-body text-[13px] text-ink placeholder:text-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-petrol">{label}</span>
      {children}
    </label>
  );
}

function SectionToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 font-body text-[13px] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-borders accent-petrol focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
      />
      {label}
    </label>
  );
}

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-tinted-surface/60 p-3">
      <p className="font-mono text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/55">{label}</p>
    </div>
  );
}

function PreviewTable({
  head,
  rows,
  foot,
  numCols,
}: {
  head: string[];
  rows: string[][];
  foot?: string[];
  numCols: number[];
}) {
  const numSet = new Set(numCols);
  return (
    <div className="overflow-x-auto rag-scroll">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-petrol text-white">
            {head.map((h, i) => (
              <th
                key={h}
                className={[
                  'px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider',
                  numSet.has(i) ? 'text-right' : '',
                ].join(' ')}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-borders/60">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={[
                    'px-3 py-1.5 text-[13px]',
                    ci === 0 ? 'font-body text-ink' : 'font-mono tabular-nums text-ink/80',
                    numSet.has(ci) ? 'text-right' : '',
                  ].join(' ')}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="bg-ink text-white">
              {foot.map((cell, ci) => (
                <td
                  key={ci}
                  className={[
                    'px-3 py-1.5 text-[13px] font-semibold',
                    ci === 0 ? 'font-body' : 'font-mono tabular-nums',
                    numSet.has(ci) ? 'text-right' : '',
                  ].join(' ')}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
