import { useCallback, useId } from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (n: number) => string;
  onChange: (v: number) => void;
  hint?: string;
}

const defaultFormat = (n: number) => n.toString();

/**
 * Linear range input. For logarithmic scaling use LogSlider.
 */
export default function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  format = defaultFormat,
  onChange,
  hint,
}: RangeSliderProps) {
  const id = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-mono text-[11px] uppercase tracking-wider text-petrol"
        >
          {label}
        </label>
        <output
          htmlFor={id}
          className="font-mono text-sm font-medium tabular-nums text-ink"
        >
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        aria-label={label}
        className="rag-slider"
      />
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-ink/50">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {hint && <p className="font-body text-xs text-ink/60">{hint}</p>}
    </div>
  );
}
