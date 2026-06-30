import { useCallback, useId, useMemo } from 'react';

interface LogSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (n: number) => string;
  onChange: (v: number) => void;
  hint?: string;
}

/**
 * Logarithmic range input. Internally maps a 0..1000 slider position
 * to a value in [min, max] using a base-10 log scale.
 */
export default function LogSlider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  hint,
}: LogSliderProps) {
  const id = useId();

  const { sliderValue, setFromSlider } = useMemo(
    () => makeLogMapper(min, max),
    [min, max],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pos = Number(e.target.value);
      const v = setFromSlider(pos);
      onChange(snapToStep(v, step, min));
    },
    [onChange, setFromSlider, step, min],
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
        min={0}
        max={1000}
        step={1}
        value={sliderValue(value)}
        onChange={handleChange}
        aria-label={label}
        className="rag-slider"
      />
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-ink/50">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {hint && (
        <p className="font-body text-xs text-ink/60">{hint}</p>
      )}
    </div>
  );
}

function snapToStep(v: number, step: number, min: number): number {
  if (step <= 1) return Math.max(min, Math.round(v));
  const snapped = Math.round(v / step) * step;
  return Math.max(min, snapped);
}

function makeLogMapper(min: number, max: number) {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);

  function sliderValue(v: number): number {
    if (v <= min) return 0;
    if (v >= max) return 1000;
    const lv = Math.log10(v);
    return Math.round(((lv - logMin) / (logMax - logMin)) * 1000);
  }

  function setFromSlider(pos: number): number {
    const clamped = Math.min(1000, Math.max(0, pos));
    const lv = logMin + (clamped / 1000) * (logMax - logMin);
    return Math.pow(10, lv);
  }

  return { sliderValue, setFromSlider };
}
