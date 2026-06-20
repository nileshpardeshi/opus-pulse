// Module J — Delivery Marketplace (productivity-to-margin, deterministic)
import type { Accelerator } from '../types';
import { round } from '../utils';

export interface MarketplaceImpact {
  effortSavedHours: number;
  baseCost: number;
  adjustedCost: number;
  // outcome: price unchanged → full saving flows to margin
  outcomePrice: number;
  outcomeMarginBefore: number;
  outcomeMarginAfter: number;
  // TNM: saving reduces billed hours → revenue (and margin gain) lost to client
  tnmRevenueBefore: number;
  tnmRevenueAfter: number;
}

export function effortSavedHours(asset: Accelerator, totalHours: number): number {
  return round(totalHours * asset.effortSavedFactor);
}

export function marketplaceImpact(
  asset: Accelerator,
  totalHours: number,
  blendedHourlyCost: number,
  outcomePrice: number,
  tnmRatePerHour: number,
): MarketplaceImpact {
  const saved = effortSavedHours(asset, totalHours);
  const baseCost = totalHours * blendedHourlyCost;
  const adjustedCost = (totalHours - saved) * blendedHourlyCost;
  return {
    effortSavedHours: saved,
    baseCost: round(baseCost),
    adjustedCost: round(adjustedCost),
    outcomePrice: round(outcomePrice),
    outcomeMarginBefore: outcomePrice > 0 ? (outcomePrice - baseCost) / outcomePrice : 0,
    outcomeMarginAfter: outcomePrice > 0 ? (outcomePrice - adjustedCost) / outcomePrice : 0,
    tnmRevenueBefore: round(totalHours * tnmRatePerHour),
    tnmRevenueAfter: round((totalHours - saved) * tnmRatePerHour),
  };
}

export function realizedVsEstimated(est: number, actual: number): { variancePct: number; honest: boolean } {
  if (est <= 0) return { variancePct: 0, honest: true };
  const variancePct = (actual - est) / est;
  return { variancePct, honest: Math.abs(variancePct) <= 0.15 };
}
