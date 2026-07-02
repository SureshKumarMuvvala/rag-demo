// Small shared label helpers used across the Estimate UI and summary.

import type { CustomNamed } from './types';

/** Fallback name for an unnamed custom ("Bring Your Model") choice. */
export const CUSTOM_MODEL_FALLBACK = 'Bring Your Model';

/** Display name for a custom rate override; falls back when blank. */
export function customModelName(o?: CustomNamed | null): string {
  const n = o?.name?.trim();
  return n && n.length > 0 ? n : CUSTOM_MODEL_FALLBACK;
}
