import { forwardRef, useRef } from 'react';

// ---------------------------------------------------------------------------
// Radio-card tile group
// ---------------------------------------------------------------------------

export interface TileOption<T extends string> {
  value: T;
  title: string;
  /** Mono price/spec sub-label. */
  sub?: string;
  /** Explore topic id for the optional "?" deep-link. */
  help?: string;
}

interface TileGroupProps<T extends string> {
  label: string;
  value: T;
  options: TileOption<T>[];
  onChange: (v: T) => void;
  onHelp?: (topicId: string) => void;
  columns?: 2 | 3 | 4;
  /** Optional trailing "＋ Custom" tile. */
  custom?: { active: boolean; onSelect: () => void };
}

const COL_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

export function TileGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  onHelp,
  columns = 2,
  custom,
}: TileGroupProps<T>) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const count = options.length + (custom ? 1 : 0);
  const selectedIndex = custom?.active
    ? options.length
    : Math.max(0, options.findIndex((o) => o.value === value));

  function selectAt(i: number) {
    if (i < options.length) onChange(options[i].value);
    else custom?.onSelect();
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number) {
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % count;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + count) % count;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectAt(i);
      return;
    } else return;
    e.preventDefault();
    selectAt(next);
    btnRefs.current[next]?.focus();
  }

  return (
    <fieldset>
      <legend className="mb-2 font-mono text-[11px] uppercase tracking-wider text-petrol">
        {label}
      </legend>
      <div role="radiogroup" aria-label={label} className={`grid gap-2 ${COL_CLASS[columns]}`}>
        {options.map((opt, i) => {
          const selected = !custom?.active && opt.value === value;
          return (
            <TileButton
              key={opt.value}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              title={opt.title}
              sub={opt.sub}
              selected={selected}
              tabIndex={i === selectedIndex ? 0 : -1}
              onSelect={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onHelp={opt.help && onHelp ? () => onHelp(opt.help as string) : undefined}
            />
          );
        })}
        {custom && (
          <TileButton
            ref={(el) => {
              btnRefs.current[options.length] = el;
            }}
            title="＋ Custom"
            sub="hand-set pricing"
            selected={custom.active}
            isCustom
            tabIndex={selectedIndex === options.length ? 0 : -1}
            onSelect={custom.onSelect}
            onKeyDown={(e) => handleKeyDown(e, options.length)}
          />
        )}
      </div>
    </fieldset>
  );
}

interface TileButtonProps {
  title: string;
  sub?: string;
  selected: boolean;
  tabIndex: number;
  isCustom?: boolean;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onHelp?: () => void;
}

const TileButton = forwardRef<HTMLButtonElement, TileButtonProps>(function TileButton(
  { title, sub, selected, tabIndex, isCustom, onSelect, onKeyDown, onHelp },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={[
        'relative flex flex-col rounded-xl border p-3 pr-6 text-left transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-surfaces',
        selected
          ? 'border-petrol bg-tinted-surface ring-1 ring-petrol'
          : isCustom
            ? 'border-dashed border-ink/30 hover:border-petrol hover:bg-tinted-surface/60'
            : 'border-borders hover:border-petrol/60 hover:bg-tinted-surface/60',
      ].join(' ')}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="font-display text-[13px] font-medium text-ink">{title}</span>
        {selected && (
          <span className="shrink-0 font-mono text-sm text-petrol" aria-hidden="true">
            ✓
          </span>
        )}
      </span>
      {sub && <span className="mt-1 font-mono text-[10px] leading-snug text-ink/55">{sub}</span>}
      {onHelp && (
        <span
          role="button"
          tabIndex={-1}
          aria-label="Explain in Explore"
          onClick={(e) => {
            e.stopPropagation();
            onHelp();
          }}
          className="absolute bottom-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-borders bg-surfaces font-mono text-[9px] text-ink/50 hover:border-petrol hover:text-petrol"
        >
          ?
        </span>
      )}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Stat card (numeric slider/stepper) — wraps an existing slider control
// ---------------------------------------------------------------------------

export function StatCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-borders bg-surfaces p-3.5 shadow-card">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-borders bg-surfaces p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-borders accent-petrol focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
      />
      <span className="min-w-0">
        <span className="block font-body text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block font-mono text-[10px] text-ink/55">{hint}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Numeric field (custom rate inputs)
// ---------------------------------------------------------------------------

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 'any',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number | 'any';
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink/55">{label}</span>
      <span className="flex items-center gap-1 rounded-lg border border-borders bg-surfaces px-2 py-1.5 focus-within:ring-2 focus-within:ring-petrol-light">
        {prefix && <span className="font-mono text-[12px] text-ink/50">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent font-mono text-[13px] tabular-nums text-ink focus:outline-none"
        />
        {suffix && <span className="font-mono text-[11px] text-ink/50">{suffix}</span>}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// "custom" badge + reset link
// ---------------------------------------------------------------------------

export function CustomBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber">
      custom
    </span>
  );
}
