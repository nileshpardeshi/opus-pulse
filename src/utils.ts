import type { Currency } from './types';

let _c = 0;
export function uid(p = 'id'): string {
  _c += 1;
  return `${p}_${Date.now().toString(36)}_${_c}`;
}

// Illustrative FX: 1 USD = X local
export const USD_PER_UNIT: Record<Currency, number> = {
  USD: 1,
  INR: 1 / 83,
  CAD: 1 / 1.36,
};

export function convert(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return (amount * USD_PER_UNIT[from]) / USD_PER_UNIT[to];
}

const SYMBOL: Record<Currency, string> = { USD: '$', INR: '₹', CAD: 'C$' };

export function fmtMoney(amount: number, currency: Currency = 'USD', opts: { compact?: boolean; decimals?: number } = {}): string {
  const sym = SYMBOL[currency];
  const { compact = false, decimals } = opts;
  if (compact) {
    const a = Math.abs(amount);
    if (a >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`;
    if (a >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}k`;
  }
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 0 })}`;
}

export function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtNum(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function round(v: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
