// Module F — Outcome pricing engine + Pricing AI (deterministic core)
import type { DeliveryModel } from '../types';
import { round } from '../utils';

export interface PricingInputs {
  storyPoints: number;
  monthlyCostUsd: number; // team loaded cost / month
  monthlyBillingUsd: number; // TNM run-rate / month
  durationMonths: number;
  minMarginPct: number; // hard floor
  targetMarginPct: number; // desired
  riskBufferPct: number; // scope-volatility buffer on points
  milestones: number;
}

export interface PricingResult {
  costToDeliver: number;
  tnmRunRate: number;
  priceFloor: number;
  recommendedPrice: number;
  marginPct: number;
  pricePerSp: number;
  pricePerMilestone: number;
  floorBinding: boolean;
}

export function costToDeliver(monthlyCostUsd: number, durationMonths: number, riskBufferPct = 0): number {
  return monthlyCostUsd * durationMonths * (1 + riskBufferPct);
}

export function tnmRunRate(monthlyBillingUsd: number, durationMonths: number): number {
  return monthlyBillingUsd * durationMonths;
}

/** Hard price floor: price ≥ loaded_cost ÷ (1 − min_margin%). */
export function priceFloor(cost: number, minMarginPct: number): number {
  return cost / (1 - minMarginPct);
}

export function computePricing(i: PricingInputs): PricingResult {
  const cost = costToDeliver(i.monthlyCostUsd, i.durationMonths, i.riskBufferPct);
  const runRate = tnmRunRate(i.monthlyBillingUsd, i.durationMonths);
  const floor = priceFloor(cost, i.minMarginPct);
  const pricedForTarget = cost / (1 - i.targetMarginPct);
  // clamp: never below the hard floor or the TNM run-rate (FR-F4 / §9)
  const recommended = round(Math.max(pricedForTarget, floor, runRate), 0);
  const floorBinding = Math.max(floor, runRate) >= pricedForTarget;
  return {
    costToDeliver: round(cost),
    tnmRunRate: round(runRate),
    priceFloor: round(floor),
    recommendedPrice: recommended,
    marginPct: recommended > 0 ? (recommended - cost) / recommended : 0,
    pricePerSp: i.storyPoints > 0 ? round(recommended / i.storyPoints) : 0,
    pricePerMilestone: i.milestones > 0 ? round(recommended / i.milestones) : 0,
    floorBinding,
  };
}

// ── Multi-model pricing (FR-F8) ────────────────────────────────────────────────
export interface ModelPrice {
  model: DeliveryModel;
  price: number;
  marginPct: number;
  note: string;
}

export function priceAllModels(i: PricingInputs): ModelPrice[] {
  const base = computePricing(i);
  const cost = base.costToDeliver;
  const floor = base.priceFloor;
  const runRate = base.tnmRunRate;

  const tnmMargin = runRate > 0 ? (runRate - cost) / runRate : 0;

  // managed-capacity: small premium over the TNM run-rate for a committed pod + SLA
  const mcPrice = round(Math.max(runRate * 1.05, floor), 0);
  // gain-share: TNM floor + expected bonus (half of the target upside)
  const bonus = Math.max(0, base.recommendedPrice - runRate) * 0.5;
  const gsPrice = round(Math.max(runRate + bonus, floor), 0);
  // outcome + warranty: outcome price + priced hypercare tail (~8%)
  const owPrice = round(base.recommendedPrice * 1.08, 0);

  const m = (p: number) => (p > 0 ? (p - cost) / p : 0);
  return [
    { model: 'tnm', price: round(runRate, 0), marginPct: tnmMargin, note: 'Per-hour billing (eroding)' },
    { model: 'managed-capacity', price: mcPrice, marginPct: m(mcPrice), note: 'Committed pod + velocity SLA' },
    { model: 'gain-share', price: gsPrice, marginPct: m(gsPrice), note: 'TNM floor + delivery bonus' },
    { model: 'outcome', price: base.recommendedPrice, marginPct: m(base.recommendedPrice), note: 'Fixed price per feature' },
    { model: 'outcome-warranty', price: owPrice, marginPct: m(owPrice), note: 'Outcome + priced hypercare tail' },
  ];
}

// ── Estimation-integrity check (FR-F7) ──────────────────────────────────────────
export interface IntegrityFlag {
  flagged: boolean;
  message: string;
}

export function estimationIntegrity(proposedSp: number, historicalSpPerFeature: number): IntegrityFlag {
  if (historicalSpPerFeature <= 0) return { flagged: false, message: 'No historical baseline' };
  const ratio = proposedSp / historicalSpPerFeature;
  if (ratio > 1.25)
    return { flagged: true, message: `Sizing is ${Math.round((ratio - 1) * 100)}% above historical actuals — review for sandbagging.` };
  return { flagged: false, message: 'Sizing within historical norms.' };
}
