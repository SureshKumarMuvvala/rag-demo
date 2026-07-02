import { useEffect, useMemo, useState } from 'react';
import type { Inputs } from '../../../lib/types';
import {
  SAMPLE_PROFILES,
  buildSampleDoc,
  renderScannedDataUrl,
  sampleDocText,
  samplePreview,
} from '../../../lib/sampleDocs';
import type { SampleProfile } from '../../../lib/sampleDocs';
import { countTokens } from '../../../lib/docAnalysis';
import { downloadSamplePdf } from '../../../lib/samplePdf';
import Icon from '../../Icon';

interface Props {
  /** Apply a profile's patch to the shared Estimate state and close the window. */
  onSave: (patch: Partial<Inputs>) => void;
}

export default function SampleDocsTab({ onSave }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl font-body text-[13px] text-ink/70">
          Fictional, watermarked welfare documents generated in your browser — one per density
          profile. Download a PDF to see how each looks, and its measured token count. Pick the one
          that matches your real documents.
        </p>
        <button
          type="button"
          onClick={() => SAMPLE_PROFILES.forEach((p) => downloadSamplePdf(p.id))}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-petrol bg-surfaces px-3 py-1.5 font-display text-[12px] font-semibold text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          <Icon name="download" className="h-4 w-4" />
          Download all samples
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SAMPLE_PROFILES.map((p) => (
          <SampleCard key={p.id} profile={p} onUse={() => onSave(p.patch)} />
        ))}
      </div>
    </div>
  );
}

function SampleCard({ profile, onUse }: { profile: SampleProfile; onUse: () => void }) {
  const [measured, setMeasured] = useState<number | null>(null);

  const doc = useMemo(
    () => (profile.kind !== 'scanned' ? buildSampleDoc(profile.id) : null),
    [profile.id, profile.kind],
  );
  const preview = useMemo(() => (doc ? samplePreview(doc) : ''), [doc]);
  const scannedUrl = useMemo(
    () => (profile.scanned ? renderScannedDataUrl(1) : ''),
    [profile.scanned],
  );

  useEffect(() => {
    if (profile.kind === 'scanned') {
      setMeasured(profile.targetTokens);
      return;
    }
    let alive = true;
    countTokens(doc ? sampleDocText(doc) : '').then((t) => {
      if (alive) setMeasured(t);
    });
    return () => {
      alive = false;
    };
  }, [profile.id, profile.kind, profile.targetTokens, doc]);

  const tokensValue =
    measured == null
      ? 'measuring…'
      : profile.scanned
        ? `vision ≈ ${measured.toLocaleString('en-US')}`
        : `≈ ${measured.toLocaleString('en-US')} (measured)`;

  return (
    <div className="flex flex-col rounded-xl border border-borders bg-surfaces p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-ink">{profile.name}</h4>
        <span className="rounded-full bg-tinted-surface px-2 py-0.5 font-mono text-[10px] text-petrol">
          {profile.bandLabel}
        </span>
      </div>

      {/* Preview */}
      {profile.scanned && scannedUrl ? (
        <img
          src={scannedUrl}
          alt={`Rendered ${profile.name} circular (image, no selectable text)`}
          className="mt-3 h-48 w-full rounded-lg border border-borders object-contain bg-tinted-surface/40"
        />
      ) : (
        <pre className="mt-3 h-48 overflow-auto rag-scroll whitespace-pre-wrap rounded-lg border border-borders bg-tinted-surface/30 p-3 font-mono text-[11px] leading-relaxed text-ink/80">
          {preview}
        </pre>
      )}

      {/* Facts */}
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-borders/60 pt-3">
        <Fact k="Content" v={profile.kind} />
        <Fact k="Tokens/page" v={tokensValue} />
        <Fact k="Pages" v="1" />
      </dl>
      <p className="mt-2 font-body text-[12px] text-ink/60">{profile.note}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadSamplePdf(profile.id)}
          className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-3.5 py-1.5 font-display text-[13px] font-semibold text-white shadow-glow-sm transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          <Icon name="download" className="h-4 w-4" />
          Download PDF
        </button>
        <button
          type="button"
          onClick={onUse}
          className="inline-flex items-center gap-2 rounded-full border border-petrol bg-surfaces px-3.5 py-1.5 font-display text-[13px] font-semibold text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          Use this profile
          <Icon name="arrow-right" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="font-mono text-[9px] uppercase tracking-wider text-ink/50">{k}</dt>
      <dd className="font-mono text-[11px] text-ink">{v}</dd>
    </div>
  );
}
