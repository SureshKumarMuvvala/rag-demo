import type { MiscItem } from '../../lib/types';

const PLACEHOLDERS = [
  'SSO / security review',
  'Data labeling',
  'Compliance audit',
  'CDN',
  'Support tooling',
];

interface MiscEditorProps {
  misc: MiscItem[];
  onChange: (m: MiscItem[]) => void;
  /** Monotonic id source (avoids Date.now/Math.random in render). */
  nextId: () => string;
}

export default function MiscEditor({ misc, onChange, nextId }: MiscEditorProps) {
  function add() {
    onChange([
      ...misc,
      { id: nextId(), label: '', amount: 0, cadence: 'monthly' },
    ]);
  }
  function update(id: string, patch: Partial<MiscItem>) {
    onChange(misc.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function remove(id: string) {
    onChange(misc.filter((m) => m.id !== id));
  }

  return (
    <fieldset>
      <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-petrol">
        Miscellaneous cost lines
      </legend>
      <div className="flex flex-col gap-2">
        {misc.map((m, i) => (
          <div
            key={m.id}
            className="flex flex-col gap-2 rounded-xl border border-borders bg-surfaces p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={m.label}
              placeholder={PLACEHOLDERS[i % PLACEHOLDERS.length]}
              onChange={(e) => update(m.id, { label: e.target.value })}
              aria-label="Cost label"
              className="min-w-0 flex-1 rounded-lg border border-borders bg-surfaces px-2 py-1.5 font-body text-[13px] text-ink placeholder:text-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
            />
            <span className="flex items-center gap-1 rounded-lg border border-borders bg-surfaces px-2 py-1.5 focus-within:ring-2 focus-within:ring-petrol-light">
              <span className="font-mono text-[12px] text-ink/50">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={Number.isFinite(m.amount) ? m.amount : ''}
                onChange={(e) => update(m.id, { amount: Number(e.target.value) })}
                aria-label="Amount"
                className="w-24 bg-transparent font-mono text-[13px] tabular-nums text-ink focus:outline-none"
              />
            </span>
            <div className="inline-flex overflow-hidden rounded-lg border border-borders">
              {(['monthly', 'oneTime'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={m.cadence === c}
                  onClick={() => update(m.id, { cadence: c })}
                  className={[
                    'px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
                    m.cadence === c ? 'bg-petrol text-white' : 'bg-surfaces text-ink/60 hover:bg-tinted-surface',
                  ].join(' ')}
                >
                  {c === 'monthly' ? 'Monthly' : 'One-time'}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Delete cost line"
              onClick={() => remove(m.id)}
              className="self-end rounded-lg border border-borders px-2 py-1.5 font-mono text-sm text-ink/50 hover:border-alert hover:text-alert focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light sm:self-auto"
            >
              ×
            </button>
            </div>
            <input
              type="text"
              value={m.note ?? ''}
              placeholder="note (optional)"
              onChange={(e) => update(m.id, { note: e.target.value })}
              aria-label="Note"
              className="w-full rounded-lg border border-borders/60 bg-tinted-surface/30 px-2 py-1 font-body text-[11px] text-ink/70 placeholder:text-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-petrol/50 px-3 py-1.5 font-display text-[13px] font-medium text-petrol hover:bg-tinted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
      >
        ＋ Add cost
      </button>
    </fieldset>
  );
}
