// Module C — Margin & cost engine (deterministic)
import type { Allocation, CostComponent, Employee, Project } from '../types';
import { toUsd } from '../utils';

/** Annual loaded cost in the employee's own currency (sum of line items). */
export function loadedCostAnnual(e: Employee): number {
  return e.costLineItems.reduce((s, li) => s + li.value, 0);
}

export function loadedCostAnnualUsd(e: Employee): number {
  return toUsd(loadedCostAnnual(e), e.currency);
}

export function loadedCostMonthlyUsd(e: Employee): number {
  return loadedCostAnnualUsd(e) / 12;
}

export function costBreakdownUsd(e: Employee): Array<{ component: CostComponent; usd: number }> {
  return e.costLineItems.map((li) => ({ component: li.component, usd: toUsd(li.value, e.currency) }));
}

export interface ProjectEconomics {
  projectId: string;
  revenueMonthlyUsd: number;
  costMonthlyUsd: number;
  profitMonthlyUsd: number;
  marginPct: number;
  headcount: number;
}

export function projectEconomics(
  project: Project,
  allocations: Allocation[],
  employees: Employee[],
): ProjectEconomics {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const projAllocs = allocations.filter((a) => a.projectId === project.id && a.billable);
  let cost = 0;
  let headcount = 0;
  projAllocs.forEach((a) => {
    const e = byId.get(a.employeeId);
    if (!e || e.status === 'left') return;
    cost += loadedCostMonthlyUsd(e) * a.allocationPct;
    headcount += 1;
  });
  const revenue = project.monthlyBilling.amount;
  return {
    projectId: project.id,
    revenueMonthlyUsd: revenue,
    costMonthlyUsd: cost,
    profitMonthlyUsd: revenue - cost,
    marginPct: revenue > 0 ? (revenue - cost) / revenue : 0,
    headcount,
  };
}

export function marginPct(revenue: number, cost: number): number {
  return revenue > 0 ? (revenue - cost) / revenue : 0;
}

/**
 * Project the monthly margin curve forward N months, applying an appraisal hike
 * to cost at the appraisal cycle month (bill rate frozen).
 */
export interface MarginPoint {
  month: number;
  label: string;
  revenue: number;
  cost: number;
  marginPct: number;
}

export function projectMarginCurve(
  econ: ProjectEconomics,
  months: number,
  appraisalHikePct: number,
  appraisalMonth: number,
): MarginPoint[] {
  const out: MarginPoint[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let cost = econ.costMonthlyUsd;
  for (let m = 0; m < months; m += 1) {
    if (m === appraisalMonth) cost *= 1 + appraisalHikePct;
    out.push({
      month: m,
      label: monthNames[m % 12],
      revenue: econ.revenueMonthlyUsd,
      cost,
      marginPct: marginPct(econ.revenueMonthlyUsd, cost),
    });
  }
  return out;
}

export function monthsToFloor(curve: MarginPoint[], floorPct: number): number | null {
  const hit = curve.find((p) => p.marginPct < floorPct);
  return hit ? hit.month : null;
}

/** Backfill cost delta when a resource is replaced at a higher rate. */
export function backfillDeltaUsd(e: Employee, replacementHikePct = 0.15): number {
  return loadedCostAnnualUsd(e) * replacementHikePct;
}
