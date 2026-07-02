// Small shared label helpers used across the Estimate UI, summary, and exports.

import type { AiToolKey, CustomNamed, Inputs } from './types';
import { RATES } from './rates';

/** Fallback name for an unnamed custom ("Bring Your Model") choice. */
export const CUSTOM_MODEL_FALLBACK = 'Bring Your Model';

/** Display name for a custom rate override; falls back when blank. */
export function customModelName(o?: CustomNamed | null): string {
  const n = o?.name?.trim();
  return n && n.length > 0 ? n : CUSTOM_MODEL_FALLBACK;
}

/** True when any selected AI tool's per-seat price was edited from its default. */
export function aiToolsEdited(inputs: Inputs): boolean {
  if (inputs.aiToolsMode !== 'byTool') return false;
  return (Object.keys(inputs.aiTools) as AiToolKey[]).some((k) => {
    const line = inputs.aiTools[k];
    return line != null && line.perSeat !== RATES.aiTools[k].perSeat;
  });
}
