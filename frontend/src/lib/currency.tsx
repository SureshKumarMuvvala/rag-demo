// Display-time currency handling. The cost MODEL stays authored in USD (see
// rates.ts / costs.ts); we convert only when rendering money to the user.
//
// Chosen input approach (the simpler, consistent path from the spec):
//   • Per-unit provider rate labels in tiles and custom-rate INPUT fields stay
//     authored in USD — they are USD-quoted reference rates.
//   • Every COMPUTED OUTPUT (totals, buckets, annual, one-time, misc, exports)
//     is converted to the selected currency for display.

import { createContext, useContext, useMemo, useState } from 'react';

export type Currency = 'INR' | 'USD';

/** Standard illustrative conversion — editable; shown to the user. */
export const USD_TO_INR = 95.1;

/** Default currency for the whole app. */
export const DEFAULT_CURRENCY: Currency = 'INR';

export function currencySymbol(currency: Currency): string {
  return currency === 'INR' ? '₹' : '$';
}

/** Convert a USD amount into the target currency's nominal value. */
export function convert(amountUSD: number, currency: Currency): number {
  return currency === 'INR' ? amountUSD * USD_TO_INR : amountUSD;
}

/** Transparency stamp shown near the currency selector and in exports. */
export const CONVERSION_STAMP = `1 USD = ${currencySymbol('INR')}${USD_TO_INR} · illustrative rate`;

/**
 * Format a USD amount in the selected currency with full digit grouping and
 * the right symbol. USD uses en-US grouping ("$12,500"); INR uses Indian
 * lakh-crore grouping ("₹11,87,500"). No decimals for large figures; small
 * figures (< 1,000 in the display currency) keep up to two decimals.
 */
export function formatMoney(amountUSD: number, currency: Currency): string {
  const amt = convert(amountUSD, currency);
  const sign = amt < 0 ? '-' : '';
  const abs = Math.abs(amt);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const maximumFractionDigits = abs < 1_000 ? 2 : 0;
  const body = abs.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
  return `${sign}${currencySymbol(currency)}${body}`;
}

/**
 * Compact form for tight spots (e.g. the mobile pinned total). USD compacts to
 * k/M; INR compacts to the Indian lakh (L) / crore (Cr) scale.
 */
export function formatMoneyShort(amountUSD: number, currency: Currency): string {
  const amt = convert(amountUSD, currency);
  const sign = amt < 0 ? '-' : '';
  const abs = Math.abs(amt);
  const sym = currencySymbol(currency);
  const trim = (n: number, d: number) => n.toFixed(d).replace(/\.0$/, '');

  if (currency === 'INR') {
    if (abs >= 1e7) return `${sign}${sym}${trim(abs / 1e7, abs >= 1e8 ? 0 : 1)}Cr`;
    if (abs >= 1e5) return `${sign}${sym}${trim(abs / 1e5, abs >= 1e6 ? 0 : 1)}L`;
    if (abs >= 1e3) return `${sign}${sym}${trim(abs / 1e3, 0)}k`;
    return `${sign}${sym}${Math.round(abs)}`;
  }
  if (abs >= 1e6) return `${sign}${sym}${trim(abs / 1e6, abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}${sym}${trim(abs / 1e3, abs >= 1e4 ? 0 : 1)}k`;
  return `${sign}${sym}${Math.round(abs)}`;
}

// ---------------------------------------------------------------------------
// Shared-state context
// ---------------------------------------------------------------------------

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const value = useMemo(() => ({ currency, setCurrency }), [currency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}

/** Convenience: a formatter bound to the current currency. */
export function useMoney(): (amountUSD: number) => string {
  const { currency } = useCurrency();
  return useMemo(() => (n: number) => formatMoney(n, currency), [currency]);
}
