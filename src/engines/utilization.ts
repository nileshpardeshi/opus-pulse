// Module O — Bench & Utilization (deterministic)
import type { Employee, UtilizationRecord } from '../types';
import { loadedCostMonthlyUsd } from './margin';
import { round } from '../utils';

export interface UtilizationSummary {
  avgUtilizationPct: number;
  benchCount: number;
  benchCostMonthlyUsd: number;
  underUtilized: number; // < 0.6
  overUtilized: number; // > 0.95
}

export function utilizationSummary(
  records: UtilizationRecord[],
  employees: Employee[],
  underThreshold = 0.6,
  overThreshold = 0.95,
): UtilizationSummary {
  const byId = new Map(employees.map((e) => [e.id, e]));
  if (records.length === 0) return { avgUtilizationPct: 0, benchCount: 0, benchCostMonthlyUsd: 0, underUtilized: 0, overUtilized: 0 };

  let benchCost = 0;
  let benchCount = 0;
  let under = 0;
  let over = 0;
  const avg = records.reduce((s, r) => {
    const e = byId.get(r.employeeId);
    if (e && e.status === 'on-bench') {
      benchCount += 1;
      benchCost += loadedCostMonthlyUsd(e);
    }
    if (r.utilizationPct < underThreshold) under += 1;
    if (r.utilizationPct > overThreshold) over += 1;
    return s + r.utilizationPct;
  }, 0) / records.length;

  return {
    avgUtilizationPct: avg,
    benchCount,
    benchCostMonthlyUsd: round(benchCost),
    underUtilized: under,
    overUtilized: over,
  };
}

export function utilizationFlag(pct: number, underThreshold = 0.6, overThreshold = 0.95): 'under' | 'over' | 'ok' {
  if (pct < underThreshold) return 'under';
  if (pct > overThreshold) return 'over';
  return 'ok';
}
