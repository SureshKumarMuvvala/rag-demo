import type { AiToolKey, AiToolLine, Inputs } from '../../lib/types';
import { RATES } from '../../lib/rates';
import { useMoney } from '../../lib/currency';
import { CustomBadge, MoneyField, NumberField } from './primitives';

interface Props {
  inputs: Inputs;
  onChange: (patch: Partial<Inputs>) => void;
}

const TOOL_KEYS = Object.keys(RATES.aiTools) as AiToolKey[];

/**
 * Optional "AI / build tooling" (vibe-coding) cost editor. Per-tool seat pricing
 * or a single flat amount. Seat prices/amounts are entered in the selected
 * currency and stored as USD (MoneyField handles the conversion).
 */
export default function AiToolsEditor({ inputs, onChange }: Props) {
  const money = useMoney();
  const mode = inputs.aiToolsMode;

  function setTool(key: AiToolKey, line: AiToolLine | null) {
    const next = { ...inputs.aiTools };
    if (line == null) delete next[key];
    else next[key] = line;
    onChange({ aiTools: next });
  }

  const total =
    mode === 'flat'
      ? Math.max(0, inputs.aiToolsFlatMonthly || 0)
      : TOOL_KEYS.reduce((s, k) => {
          const l = inputs.aiTools[k];
          return s + (l ? Math.max(0, l.perSeat || 0) * Math.max(0, l.seats || 0) : 0);
        }, 0);

  return (
    <div className="rounded-xl border border-borders bg-surfaces p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[13px] font-medium text-ink">AI / build tooling</span>
        <span className="font-mono text-[13px] tabular-nums text-ink">
          {money(total)}
          <span className="ml-1 text-ink/40">/mo</span>
        </span>
      </div>

      {/* Mode toggle */}
      <div className="mt-3 inline-flex overflow-hidden rounded-lg border border-borders">
        <ModeBtn active={mode === 'byTool'} label="By tool" onClick={() => onChange({ aiToolsMode: 'byTool' })} />
        <ModeBtn active={mode === 'flat'} label="Flat amount" onClick={() => onChange({ aiToolsMode: 'flat' })} />
      </div>

      {mode === 'flat' ? (
        <div className="mt-3 w-44">
          <MoneyField
            label="AI tooling / mo"
            valueUsd={inputs.aiToolsFlatMonthly}
            min={0}
            onChangeUsd={(usd) => onChange({ aiToolsFlatMonthly: Math.max(0, usd) })}
          />
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {TOOL_KEYS.map((k) => {
            const def = RATES.aiTools[k];
            const line = inputs.aiTools[k];
            const selected = line != null;
            const edited = selected && line!.perSeat !== def.perSeat;
            return (
              <li key={k} className="rounded-lg border border-borders/70 p-2.5">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) =>
                      setTool(
                        k,
                        e.target.checked
                          ? { perSeat: def.perSeat, seats: Math.max(1, inputs.teamSize || 1) }
                          : null,
                      )
                    }
                    className="h-4 w-4 cursor-pointer rounded border-borders accent-petrol focus:outline-none focus-visible:ring-2 focus-visible:ring-petrol-light"
                  />
                  <span className="flex flex-1 items-center gap-1.5">
                    <span className="font-body text-[13px] text-ink">{def.label}</span>
                    {edited && <CustomBadge />}
                  </span>
                  <span className="font-mono text-[10px] text-ink/45">${def.perSeat}/seat default</span>
                </label>
                {selected && (
                  <div className="mt-2 grid grid-cols-2 gap-3 pl-6">
                    <MoneyField
                      label="$/seat / mo"
                      valueUsd={line!.perSeat}
                      min={0}
                      onChangeUsd={(usd) => setTool(k, { ...line!, perSeat: Math.max(0, usd) })}
                    />
                    <NumberField
                      label="Seats"
                      value={line!.seats}
                      min={0}
                      step={1}
                      onChange={(v) => setTool(k, { ...line!, seats: Math.max(0, Math.round(v)) })}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 font-mono text-[10px] leading-snug text-ink/50">
        Build-time tooling for AI-assisted (vibe-coding) development — illustrative per-seat prices,
        verified ~June 2026; usage-based plans may exceed seat price. Editable.
      </p>
    </div>
  );
}

function ModeBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
        active ? 'bg-petrol text-white' : 'bg-surfaces text-ink/60 hover:bg-tinted-surface',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
