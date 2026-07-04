import { NGO_SCHEMES, ngoSchemeUrl } from '../../../lib/ngoSchemes';
import type { NgoScheme } from '../../../lib/ngoSchemes';
import Icon from '../../Icon';

/** Trigger a client-side download of a same-origin static file. */
function downloadUrl(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function NgoSchemesTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl font-body text-[13px] text-ink/70">
          Three real 10-page Telangana welfare-scheme PDFs. Preview or download them — then drop one
          into <span className="font-semibold text-ink">Analyze my documents</span> to see the
          analyzer run on a genuine multi-page file.
        </p>
        <button
          type="button"
          onClick={() => NGO_SCHEMES.forEach((s) => downloadUrl(ngoSchemeUrl(s), s.filename))}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-petrol bg-surfaces px-3 py-1.5 font-display text-[12px] font-semibold text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          <Icon name="download" className="h-4 w-4" />
          Download all 3
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {NGO_SCHEMES.map((s) => (
          <NgoSchemeCard key={s.id} scheme={s} />
        ))}
      </div>
    </div>
  );
}

function NgoSchemeCard({ scheme }: { scheme: NgoScheme }) {
  const url = ngoSchemeUrl(scheme);
  return (
    <div className="flex flex-col rounded-xl border border-borders bg-surfaces p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-sm font-semibold text-ink">{scheme.name}</h4>
        <span className="shrink-0 rounded-full bg-tinted-surface px-2 py-0.5 font-mono text-[10px] text-petrol">
          {scheme.pages} pages
        </span>
      </div>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-ink/50">{scheme.org}</p>
      <p className="mt-2 flex-1 font-body text-[12px] leading-relaxed text-ink/70">
        {scheme.description}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-3.5 py-1.5 font-display text-[13px] font-semibold text-white shadow-glow-sm transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          <Icon name="external-link" className="h-4 w-4" />
          Preview
        </a>
        <button
          type="button"
          onClick={() => downloadUrl(url, scheme.filename)}
          className="inline-flex items-center gap-2 rounded-full border border-petrol bg-surfaces px-3.5 py-1.5 font-display text-[13px] font-semibold text-petrol transition-colors hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
        >
          <Icon name="download" className="h-4 w-4" />
          Download
        </button>
      </div>
    </div>
  );
}
