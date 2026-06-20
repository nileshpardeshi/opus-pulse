// Module K — Change Request & Scope Management (deterministic)
import type { DeliveryModel } from '../types';
import { priceFloor } from './outcomePricing';
import { round } from '../utils';

export interface CRPricingInputs {
  deltaStoryPoints: number;
  spToHours: number;
  blendedHourlyCost: number;
  model: DeliveryModel;
  tnmRatePerHour: number;
  minMarginPct: number;
  targetMarginPct: number;
}

export interface CRPricingResult {
  deltaHours: number;
  deltaCost: number;
  deltaPrice: number;
  marginPct: number;
  floorClamped: boolean;
}

/** Re-size and re-price a change request, floor-clamped for fixed-price models. */
export function priceChangeRequest(i: CRPricingInputs): CRPricingResult {
  const deltaHours = i.deltaStoryPoints * i.spToHours;
  const deltaCost = deltaHours * i.blendedHourlyCost;
  let deltaPrice: number;
  let floorClamped = false;

  if (i.model === 'tnm') {
    deltaPrice = deltaHours * i.tnmRatePerHour; // billed hours
  } else {
    const target = deltaCost / (1 - i.targetMarginPct);
    const floor = priceFloor(deltaCost, i.minMarginPct);
    deltaPrice = i.deltaStoryPoints >= 0 ? Math.max(target, floor) : target; // descope keeps target math
    floorClamped = i.deltaStoryPoints >= 0 && floor >= target;
  }

  return {
    deltaHours: round(deltaHours),
    deltaCost: round(deltaCost),
    deltaPrice: round(deltaPrice),
    marginPct: deltaPrice !== 0 ? (deltaPrice - deltaCost) / deltaPrice : 0,
    floorClamped,
  };
}

export function scopeVolatilityPct(originalSp: number, totalCrSp: number): number {
  if (originalSp <= 0) return 0;
  return totalCrSp / originalSp;
}
