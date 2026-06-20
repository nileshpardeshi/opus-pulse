// Module G — Comparison & simulation workbench (deterministic)
import type { DeliveryModel } from '../types';
import { round } from '../utils';

export interface SimBase {
  revenue: number;
  cost: number;
  timelineSprints: number;
  teamSize: number;
}

export interface SimResult extends SimBase {
  marginPct: number;
  riskFlag?: string;
}

function withMargin(b: SimBase, riskFlag?: string): SimResult {
  return { ...b, marginPct: b.revenue > 0 ? (b.revenue - b.cost) / b.revenue : 0, riskFlag };
}

/** Resource swap incl. ramp-up velocity dip + KT cost so gains aren't overstated. */
export function swapResource(
  base: SimBase,
  outgoingMonthlyCost: number,
  incomingMonthlyCost: number,
  ktCostUsd: number,
  rampDipPct = 0.15,
): SimResult {
  const costDelta = incomingMonthlyCost - outgoingMonthlyCost;
  const newCost = base.cost + costDelta + ktCostUsd + base.cost * rampDipPct * 0.1;
  return withMargin({ ...base, cost: round(newCost) }, 'Ramp dip + KT cost included');
}

/** Offshore shift: move a share of work to lower-cost geo; flags coverage risk. */
export function offshoreShift(base: SimBase, sharePct: number, offshoreSavingPct = 0.55): SimResult {
  const movedCost = base.cost * sharePct;
  const newCost = base.cost - movedCost * offshoreSavingPct;
  const risk = sharePct > 0.5 ? 'High time-zone / coverage overlap risk' : undefined;
  return withMargin({ ...base, cost: round(newCost) }, risk);
}

export function resizeTeam(base: SimBase, newSize: number, velocityPerHead: number, featureSp: number): SimResult {
  const ratio = newSize / base.teamSize;
  const newCost = base.cost * ratio;
  const newVelocity = velocityPerHead * newSize;
  const timeline = newVelocity > 0 ? Math.ceil(featureSp / newVelocity) : base.timelineSprints;
  const risk = newSize > base.teamSize * 1.3 ? 'Coordination overhead at larger team size' : undefined;
  return withMargin({ ...base, cost: round(newCost), teamSize: newSize, timelineSprints: timeline }, risk);
}

export function applyAutomation(base: SimBase, gainPct: number): SimResult {
  const newCost = base.cost * (1 - gainPct);
  const newTimeline = Math.max(1, Math.round(base.timelineSprints * (1 - gainPct * 0.5)));
  return withMargin({ ...base, cost: round(newCost), timelineSprints: newTimeline }, 'Saving retained as margin (not client discount)');
}

// ── Portfolio migration planner (FR-G5) ──────────────────────────────────────
const LADDER: DeliveryModel[] = ['tnm', 'managed-capacity', 'gain-share', 'outcome', 'outcome-warranty'];

export function nextMigrationRung(current: DeliveryModel, conversionScore: number): DeliveryModel {
  const idx = LADDER.indexOf(current);
  if (idx < 0 || idx >= LADDER.length - 1) return current;
  // higher conversion score → recommend a more aggressive jump
  const jump = conversionScore >= 75 ? 2 : 1;
  return LADDER[Math.min(idx + jump, LADDER.length - 1)];
}

export { LADDER as MIGRATION_LADDER };
