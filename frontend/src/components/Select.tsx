import { useId } from 'react';

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}

/**
 * Native <select> styled to match the RAG design system.
 * Generic over the option value type so callers preserve string-literal types.
 */
export default function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectProps<T>) {
  const id = useId();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(e.target.value as T);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-mono text-[11px] uppercase tracking-wider text-petrol"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        className={[
          'w-full appearance-none rounded-xl border border-borders bg-surfaces py-2 pl-3 pr-8',
          'font-mono text-sm text-ink',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg',
          'bg-[length:14px_14px] bg-[right_0.625rem_center] bg-no-repeat',
        ].join(' ')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2315242B'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="font-body text-xs text-ink/60">{hint}</p>}
    </div>
  );
}
