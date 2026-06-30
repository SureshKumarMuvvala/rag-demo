import Logo from './Logo';

export default function Header() {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-start gap-4">
        <Logo className="h-11 w-11 shrink-0" />
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight text-ink md:text-3xl">
            RAG · Total Cost of Ownership
          </h1>
          <p className="mt-1 max-w-2xl font-body text-sm text-ink/70">
            An interactive estimator for the monthly cost buckets of a
            production retrieval-augmented generation system.
          </p>
        </div>
      </div>
      <div className="font-mono text-[11px] uppercase tracking-wider text-ink/60">
        prices as of June 2026 · illustrative, editable
      </div>
    </header>
  );
}
