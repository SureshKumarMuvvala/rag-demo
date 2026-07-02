import { useEffect, useRef, useState } from 'react';
import type { Inputs } from '../../../lib/types';
import { RATES, DOC_SIZE_PAGES } from '../../../lib/rates';
import { useMoney } from '../../../lib/currency';
import {
  ACCEPT_ATTR,
  ACCEPTED_EXTS,
  AnalyzeError,
  MAX_FILES,
  aggregate,
  analyzeFile,
  deriveSuggestion,
  formatBytes,
  suggestionToPatch,
} from '../../../lib/docAnalysis';
import type { DocAnalysis } from '../../../lib/docAnalysis';
import Icon from '../../Icon';

type Mode = 'single' | 'multi';

interface Props {
  inputs: Inputs;
  /** Report the current save-patch suggestion up to the overlay header. */
  onSuggestion: (patch: Partial<Inputs> | null) => void;
  /** Apply a patch to the shared Estimate state and close the window. */
  onSave: (patch: Partial<Inputs>) => void;
}

export default function AnalyzeDocsTab({ inputs, onSuggestion, onSave }: Props) {
  const [mode, setMode] = useState<Mode>('single');
  const [docs, setDocs] = useState<DocAnalysis[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [corpusDocs, setCorpusDocs] = useState<number>(0);
  const corpusTouched = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const money = useMoney();
  const perM = RATES.embedModels[inputs.embedModel].perM;

  const agg = aggregate(docs);
  const suggestion = agg ? deriveSuggestion(agg, corpusDocs) : null;

  // Keep the corpus count in sync with the file count until the user edits it.
  useEffect(() => {
    if (!corpusTouched.current) setCorpusDocs(docs.length);
  }, [docs.length]);

  // Publish the current suggestion patch to the overlay header's Save button.
  const docsKey = docs.map((d) => `${d.tokens}:${d.pages}`).join('|');
  useEffect(() => {
    const a = aggregate(docs);
    onSuggestion(a ? suggestionToPatch(deriveSuggestion(a, corpusDocs)) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docsKey, corpusDocs]);

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    setErrors([]);
    setBusy(true);
    const nextErrors: string[] = [];
    const results: DocAnalysis[] = [];
    for (const f of incoming) {
      try {
        results.push(await analyzeFile(f));
      } catch (e) {
        nextErrors.push(
          e instanceof AnalyzeError ? e.message : `Could not read "${f.name}".`,
        );
      }
    }
    setBusy(false);
    if (mode === 'single') {
      setDocs(results.slice(0, 1));
    } else {
      const room = MAX_FILES - docs.length;
      if (results.length > room) {
        nextErrors.push(`Limit is ${MAX_FILES} files — extra files were skipped.`);
      }
      setDocs((prev) => [...prev, ...results].slice(0, MAX_FILES));
    }
    setErrors(nextErrors);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeDoc(i: number) {
    setDocs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function switchMode(m: Mode) {
    setMode(m);
    setDocs([]);
    setErrors([]);
    corpusTouched.current = false;
  }

  const canAdd = mode === 'single' || docs.length < MAX_FILES;

  return (
    <div className="flex flex-col gap-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <ModeBtn active={mode === 'single'} onClick={() => switchMode('single')}>
          Single document
        </ModeBtn>
        <ModeBtn active={mode === 'multi'} onClick={() => switchMode('multi')}>
          Multi-document (up to {MAX_FILES})
        </ModeBtn>
      </div>

      {/* Dropzone / picker */}
      <div className="rounded-xl border border-dashed border-borders bg-tinted-surface/30 p-5 text-center">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple={mode === 'multi'}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="udoc-file-input"
        />
        <label
          htmlFor="udoc-file-input"
          className={[
            'inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-display text-sm font-medium shadow-sm transition-colors',
            'focus-within:ring-2 focus-within:ring-petrol-light',
            canAdd
              ? 'bg-petrol text-white hover:bg-petrol-light'
              : 'pointer-events-none bg-borders text-ink/40',
          ].join(' ')}
        >
          <Icon name="file-text" className="h-4 w-4" />
          {mode === 'single' ? 'Choose a file' : docs.length ? 'Add files' : 'Choose files'}
        </label>
        <p className="mt-2 font-mono text-[10px] text-ink/55">
          Supported: {ACCEPTED_EXTS.join(', ')} · analyzed in your browser only
        </p>
        {busy && (
          <p className="mt-2 font-mono text-[11px] text-petrol">Analyzing…</p>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-alert/40 bg-alert/5 p-3">
          {errors.map((er) => (
            <li key={er} className="font-body text-[12px] text-alert">
              {er}
            </li>
          ))}
        </ul>
      )}

      {/* Per-document results */}
      {docs.length > 0 && (
        <div className="flex flex-col gap-3">
          {docs.map((d, i) => (
            <DocCard
              key={`${d.name}-${i}`}
              doc={d}
              money={money}
              perM={perM}
              onRemove={mode === 'multi' ? () => removeDoc(i) : undefined}
            />
          ))}
        </div>
      )}

      {/* Aggregate (multi) */}
      {agg && docs.length > 1 && (
        <div className="rounded-xl border border-petrol/25 bg-tinted-surface/40 p-4">
          <h4 className="font-display text-sm font-semibold text-ink">Aggregate ({agg.count} files)</h4>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
            <Stat label="Total tokens" value={`~${agg.totalTokens.toLocaleString('en-US')}`} />
            <Stat label="Avg tokens/page" value={`~${agg.tokensPerPage.toLocaleString('en-US')}`} />
            <Stat label="Est. chunks" value={`~${agg.totalChunks.toLocaleString('en-US')}`} />
            <Stat label="Est. vectors" value={`~${agg.totalVectors.toLocaleString('en-US')}`} />
          </div>
        </div>
      )}

      {/* Parameters to choose */}
      {suggestion && (
        <div className="rounded-xl border border-borders bg-surfaces p-4">
          <h4 className="font-display text-sm font-semibold text-ink">Parameters to choose</h4>
          <p className="mt-0.5 font-mono text-[10px] text-ink/55">
            detected → suggested · all approximate
          </p>

          <div className="mt-3 flex flex-col divide-y divide-borders/60">
            <ParamRow label="Documents" detected={`${docs.length} analyzed`}>
              <label className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={2_000_000}
                  value={Number.isFinite(corpusDocs) ? corpusDocs : 0}
                  onChange={(e) => {
                    corpusTouched.current = true;
                    const v = Math.max(0, Math.min(2_000_000, Math.round(Number(e.target.value))));
                    setCorpusDocs(Number.isFinite(v) ? v : 0);
                  }}
                  className="w-28 rounded-lg border border-borders bg-surfaces px-2 py-1 font-mono text-[13px] tabular-nums text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
                />
                <span className="font-mono text-[10px] text-ink/50">your real corpus</span>
              </label>
            </ParamRow>
            <ParamRow
              label="Avg document size"
              detected={`~${Math.round(agg!.avgPages)} pages`}
              suggested={
                suggestion.docSize.key === 'custom'
                  ? `${suggestion.docSize.custom} pages (custom)`
                  : `${suggestion.docSize.key} (${DOC_SIZE_PAGES[suggestion.docSize.key as keyof typeof DOC_SIZE_PAGES]} pg)`
              }
            />
            <ParamRow
              label="Tokens / page"
              detected={`~${agg!.tokensPerPage.toLocaleString('en-US')}`}
              suggested={`${suggestion.tokensPerPage.toLocaleString('en-US')} (custom · near ${suggestion.density})`}
            />
            <ParamRow label="Chunk size" detected="—" suggested="512 tokens (recommended)" />
            <ParamRow label="Chunk overlap" detected="—" suggested="10% (recommended)" />
          </div>

          <button
            type="button"
            onClick={() => onSave(suggestionToPatch(suggestion))}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-petrol px-4 py-2 font-display text-sm font-medium text-white shadow-sm transition-colors hover:bg-petrol-light focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
          >
            <Icon name="arrow-right" className="h-4 w-4" />
            Save to estimate
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bits
// ---------------------------------------------------------------------------

function DocCard({
  doc,
  money,
  perM,
  onRemove,
}: {
  doc: DocAnalysis;
  money: (usd: number) => string;
  perM: number;
  onRemove?: () => void;
}) {
  const embedUsd = (doc.tokens * perM) / 1_000_000;
  return (
    <div className="rounded-xl border border-borders bg-surfaces p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="file-text" className="h-4 w-4 text-petrol" />
          <span className="break-all font-display text-[13px] font-medium text-ink">{doc.name}</span>
          <span className="rounded-full bg-tinted-surface px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink/60">
            {doc.type}
          </span>
          {doc.scanned && (
            <span className="rounded-full bg-amber/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber">
              scanned/image — est. by page
            </span>
          )}
        </div>
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove ${doc.name}`}
            onClick={onRemove}
            className="font-mono text-ink/45 hover:text-alert focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        <Stat label="Pages" value={`${doc.pages.toLocaleString('en-US')}`} />
        <Stat label="Characters" value={`~${doc.chars.toLocaleString('en-US')}`} />
        <Stat label="Est. tokens" value={`~${doc.tokens.toLocaleString('en-US')}`} />
        <Stat label="Tokens / page" value={`~${doc.tokensPerPage.toLocaleString('en-US')}`} />
        <Stat label="Est. chunks (512+10%)" value={`~${doc.chunks.toLocaleString('en-US')}`} />
        <Stat label="Est. vectors" value={`~${doc.vectors.toLocaleString('en-US')}`} />
        <Stat label="Content type" value={doc.contentType} />
        <Stat label="~Embed cost" value={money(embedUsd)} />
      </div>
      <p className="mt-2 font-mono text-[10px] text-ink/45">{formatBytes(doc.sizeBytes)} · token counts approximate</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] uppercase tracking-wider text-ink/50">{label}</span>
      <span className="font-mono text-[13px] tabular-nums text-ink">{value}</span>
    </div>
  );
}

function ParamRow({
  label,
  detected,
  suggested,
  children,
}: {
  label: string;
  detected: string;
  suggested?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex flex-col">
        <span className="font-body text-[13px] font-medium text-ink">{label}</span>
        <span className="font-mono text-[10px] text-ink/50">detected: {detected}</span>
      </div>
      {children ?? (
        <span className="text-right font-mono text-[12px] text-petrol">{suggested}</span>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'rounded-lg px-3 py-1.5 font-display text-[13px] font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light',
        active ? 'bg-petrol text-white shadow-sm' : 'bg-surfaces text-ink/70 hover:bg-tinted-surface',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
