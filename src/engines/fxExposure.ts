// Module C / FR-C6 — FX exposure on fixed-price commitments (deterministic)
import type { CurrencyCode } from '../types';
import { convert, round } from '../utils';

export interface FxExposureResult {
  priceCurrency: CurrencyCode;
  costCurrency: CurrencyCode;
  /** swing in USD margin if the cost currency moves adversely by `shockPct` */
  exposureUsd: number;
  materialRisk: boolean;
  note: string;
}

/**
 * Models the margin swing on a fixed price when the cost currency differs from the
 * price currency and moves adversely. Distinct from FX reporting noise (§16).
 */
export function fxExposure(
  priceUsd: number,
  costUsd: number,
  priceCurrency: CurrencyCode,
  costCurrency: CurrencyCode,
  shockPct = 0.08,
): FxExposureResult {
  if (priceCurrency === costCurrency) {
    return { priceCurrency, costCurrency, exposureUsd: 0, materialRisk: false, note: 'Price and cost in same currency — no FX exposure.' };
  }
  // adverse move: cost currency strengthens vs price currency → cost rises in price terms
  const shockedCost = costUsd * (1 + shockPct);
  const exposure = round(shockedCost - costUsd);
  const marginErosionPct = priceUsd > 0 ? exposure / priceUsd : 0;
  return {
    priceCurrency,
    costCurrency,
    exposureUsd: exposure,
    materialRisk: marginErosionPct > 0.03,
    note: `A ${Math.round(shockPct * 100)}% adverse ${costCurrency} move erodes margin by ~${(marginErosionPct * 100).toFixed(1)} pts on this fixed price.`,
  };
}

export { convert as fxConvert };
