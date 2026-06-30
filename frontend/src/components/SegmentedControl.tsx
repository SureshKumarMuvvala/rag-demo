import { useId } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
}

export default function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const groupId = useId();

  function handleKey(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = options[(idx + 1) % options.length];
      onChange(next.value);
      focusButton(groupId, options[(idx + 1) % options.length].value);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = options[(idx - 1 + options.length) % options.length];
      onChange(prev.value);
      focusButton(groupId, options[(idx - 1 + options.length) % options.length].value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(options[0].value);
      focusButton(groupId, options[0].value);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = options[options.length - 1];
      onChange(last.value);
      focusButton(groupId, last.value);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[11px] uppercase tracking-wider text-petrol">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex w-full rounded-xl border border-borders bg-surfaces p-1"
      >
        {options.map((opt, idx) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              data-segment-value={opt.value}
              data-group={groupId}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKey(e, idx)}
              className={[
                'flex-1 rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg',
                active
                  ? 'bg-petrol text-white shadow-sm'
                  : 'text-ink hover:bg-tinted-surface',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function focusButton(groupId: string, value: string) {
  // Defer to allow the active class to settle before focusing.
  setTimeout(() => {
    const el = document.querySelector<HTMLButtonElement>(
      `button[data-segment-value="${value}"][data-group="${groupId}"]`,
    );
    el?.focus();
  }, 0);
}
