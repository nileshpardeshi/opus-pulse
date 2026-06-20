import type { CurrencyCode, Money } from './types';

// ── IDs ──────────────────────────────────────────────────────────────────────
let _counter = 0;
export function uid(prefix = 'id'): string {
  _counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_counter}`;
}

// ── FX ───────────────────────────────────────────────────────────────────────
// Illustrative static rates relative to USD (1 USD = X local). Effective-dated FX
// lives in the data store; this is the resolved snapshot used for reporting.
export const USD_PER_UNIT: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 1 / 83,
  GBP: 1.27,
  CAD: 1 / 1.36,
};

export function toUsd(amount: number, currency: CurrencyCode): number {
  return amount * USD_PER_UNIT[currency];
}

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return amount;
  const usd = toUsd(amount, from);
  return usd / USD_PER_UNIT[to];
}

export function convertMoney(m: Money, to: CurrencyCode): Money {
  return { amount: convert(m.amount, m.currency, to), currency: to };
}

export function money(amount: number, currency: CurrencyCode = 'USD'): Money {
  return { amount, currency };
}

export function addMoney(a: Money, b: Money): Money {
  return { amount: a.amount + convert(b.amount, b.currency, a.currency), currency: a.currency };
}

// ── Formatting ─────────────────────────────────────────────────────────────────
const SYMBOL: Record<CurrencyCode, string> = { USD: '$', INR: '₹', GBP: '£', CAD: 'C$' };

export function fmtMoney(
  amount: number,
  currency: CurrencyCode = 'USD',
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  const { compact = false, decimals } = opts;
  const sym = SYMBOL[currency];
  if (compact) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}k`;
  }
  return `${sym}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  })}`;
}

export function fmtMoneyObj(m: Money, compact = false): string {
  return fmtMoney(m.amount, m.currency, { compact });
}

export function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtPctRaw(value0to100: number, decimals = 0): string {
  return `${value0to100.toFixed(decimals)}%`;
}

export function fmtNum(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Dates ──────────────────────────────────────────────────────────────────────
export function isWeekend(date: Date, weekendDays: number[] = [0, 6]): boolean {
  return weekendDays.includes(date.getDay());
}

/** Count working days in a year, excluding weekends and a holiday count. */
export function workingDaysInYear(weekendCount = 104, holidays = 10): number {
  return 365 - weekendCount - holidays;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function round(v: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}
