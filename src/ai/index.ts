// ─────────────────────────────────────────────────────────────────────────────
// Module D / §10 — AI advisory layer (RULES-BASED MOCKS, explainable & overridable)
// "Engines compute, AI advises." Every output carries drivers + a version tag so
// it mirrors the real model-monitoring contract and is swappable for ML later.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Allocation,
  Employee,
  Project,
  RiskClassification,
  RiskDriver,
  RiskSignal,
  SOW,
} from '../types';
import { projectEconomics, projectMarginCurve, monthsToFloor, backfillDeltaUsd } from '../engines/margin';
import { money, round, clamp } from '../utils';

export const AI_VERSION = 'rules-v1';

// ── Attrition risk (FR-D8) — position-level, ethics-gated ─────────────────────
export function attritionRisk(employee: Employee): number {
  // tenure + role scarcity heuristic; advisory only, never sole basis for action
  const tenureScore = { '0-2': 55, '2-5': 40, '5-10': 30, '10+': 25 }[employee.tenureBand];
  const scarcity = employee.role.includes('Lead') ? 15 : employee.role.includes('Sr') ? 8 : 0;
  const benchPenalty = employee.status === 'on-bench' ? 20 : 0;
  return clamp(tenureScore + scarcity + benchPenalty, 0, 100);
}

export function teamAttritionRisk(employees: Employee[]): number {
  if (employees.length === 0) return 0;
  return round(employees.reduce((s, e) => s + attritionRisk(e), 0) / employees.length);
}

// ── Billing-revision probability (FR-D7) ──────────────────────────────────────
export function revisionProbability(project: Project, sow: SOW): number {
  const ageYears = (new Date('2026-06-21').getTime() - new Date(sow.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
  const ageScore = clamp(ageYears * 12, 0, 50); // older rate → more plausible to revise
  const tierScore = 25; // strategic dependency proxy
  return round(clamp(ageScore + tierScore, 0, 100));
}

// ── Outcome-conversion score (FR-D6) ──────────────────────────────────────────
export function conversionScore(project: Project, marginPct: number): number {
  // higher when margin is being squeezed and scope is stable
  const marginGap = clamp((0.2 - marginPct) * 200, 0, 40);
  const stability = project.status === 'active' ? 35 : 25;
  const base = 25;
  return round(clamp(base + marginGap + stability, 0, 100));
}

// ── Margin-risk forecaster (FR-D1..D5) ────────────────────────────────────────
export function scoreProject(
  project: Project,
  sow: SOW,
  allocations: Allocation[],
  employees: Employee[],
): RiskSignal {
  const econ = projectEconomics(project, allocations, employees);
  const curve = projectMarginCurve(econ, 12, project.appraisalHikePct, 6);
  const mToFloor = monthsToFloor(curve, sow.marginFloorPct);
  const teamEmps = employees.filter((e) => e.teamId === project.teamId);

  const conv = conversionScore(project, econ.marginPct);
  const rev = revisionProbability(project, sow);
  const attr = teamAttritionRisk(teamEmps);

  // floor-breach probability rises as months-to-floor shrinks
  const floorBreachProbability = mToFloor === null ? 0.15 : clamp(1 - mToFloor / 12, 0.1, 0.95);

  // classification: high conversion → Convert; else high revision → Revise; else Exit
  let classification: RiskClassification;
  if (econ.marginPct < sow.marginFloorPct && conv < 40) classification = 'Exit';
  else if (conv >= 55) classification = 'Convert';
  else classification = 'Revise';

  const drivers: RiskDriver[] = [
    { label: 'Appraisal compounding', weight: round(project.appraisalHikePct * 4, 2) },
    { label: 'Rate age / frozen rate', weight: round(rev / 100, 2) },
    { label: 'Attrition / backfill gap', weight: round(attr / 100, 2) },
  ].sort((a, b) => b.weight - a.weight);

  const backfill = teamEmps.reduce((s, e) => s + backfillDeltaUsd(e), 0) / Math.max(1, teamEmps.length);

  const action =
    classification === 'Convert'
      ? 'Pursue outcome conversion (strong candidate)'
      : classification === 'Revise'
        ? 'Pursue client rate revision'
        : 'Plan structured exit / renegotiation';

  return {
    id: `risk_${project.id}`,
    projectId: project.id,
    floorBreachProbability,
    conversionScore: conv,
    revisionProbability: rev,
    attritionRisk: attr,
    backfillCostDelta: money(round(backfill), 'USD'),
    classification,
    drivers,
    recommendedAction: action,
    monthsToFloor: mToFloor,
  };
}

// ── Win-probability (§10) — cold-start heuristic ──────────────────────────────
export function winProbability(marginPct: number, priceVsFloorRatio: number): number {
  // lower price (closer to floor) → higher win chance; very high margin → lower
  const priceScore = clamp((1.4 - priceVsFloorRatio) * 80, 0, 60);
  const marginPenalty = clamp((marginPct - 0.3) * 100, 0, 25);
  return round(clamp(40 + priceScore - marginPenalty, 5, 95));
}
