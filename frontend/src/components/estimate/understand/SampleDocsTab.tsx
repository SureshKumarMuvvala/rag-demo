import { useMemo } from 'react';
import type { Inputs } from '../../../lib/types';
import { SAMPLE_PROFILES, renderScannedPage } from '../../../lib/sampleDocs';
import type { SampleProfile } from '../../../lib/sampleDocs';
import Icon from '../../Icon';

interface Props {
  /** Apply a profile's patch to the shared Estimate state and close the window. */
  onSave: (patch: Partial<Inputs>) => void;
}

export default function SampleDocsTab({ onSave }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-[13px] text-ink/70">
        These samples are generated in your browser to show what each Estimate density option looks
        like. Pick the one that matches your real documents.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SAMPLE_PROFILES.map((p) => (
          <SampleCard key={p.id} profile={p} onUse={() => onSave(p.patch)} />
        ))}
      </div>
    </div>
  );
}

function SampleCard({ profile, onUse }: { profile: SampleProfile; onUse: () => void }) {
  const scannedUrl = useMemo(
    () => (profile.scanned ? renderScannedPage(profile.preview) : ''),
    [profile.scanned, profile.preview],
  );

  return (
    <div className="flex flex-col rounded-xl border border-borders bg-surfaces p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-ink">{profile.name}</h4>
        <span className="rounded-full bg-tinted-surface px-2 py-0.5 font-mono text-[10px] text-petrol">
          {profile.tokensPerPageLabel}
        </span>
      </div>

      {/* Preview */}
      {profile.scanned && scannedUrl ? (
        <img
          src={scannedUrl}
          alt={`Rendered ${profile.name} page (image, no selectable text)`}
          className="mt-3 h-44 w-full rounded-lg border border-borders object-contain bg-tinted-surface/40"
        />
      ) : (
        <pre className="mt-3 h-44 overflow-auto rag-scroll rounded-lg border border-borders bg-tinted-surface/30 p-3 font-mono text-[11px] leading-relaxed text-ink/80 whitespace-pre-wrap">
          {profile.preview}
        </pre>
      )}

      {/* Facts */}
      <dl className="mt-3 flex flex-col gap-1 border-t border-borders/60 pt-3">
        <Fact k="Content type" v={profile.contentType} />
        <Fact k="~Tokens / page" v={profile.tokensPerPageLabel} />
      </dl>
      <p className="mt-2 font-body text-[12px] text-ink/60">{profile.note}</p>

      <button
        type="button"
        onClick={onUse}
        className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg border border-petrol bg-surfaces px-3 py-1.5 font-display text-[13px] font-medium text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
      >
        <Icon name="arrow-right" className="h-4 w-4" />
        Use this profile
      </button>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-body text-[12px] text-ink/55">{k}</dt>
      <dd className="font-mono text-[12px] text-ink">{v}</dd>
    </div>
  );
}
