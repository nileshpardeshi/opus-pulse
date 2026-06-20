// Module E — Capacity engine (deterministic)
import type { Employee, VelocityRecord } from '../types';

export interface ReferenceVelocity {
  meanSp: number;
  spPerDay: number;
  samples: number;
}

/** Reference velocity from the last k velocity records for a team. */
export function referenceVelocity(records: VelocityRecord[], k = 6): ReferenceVelocity {
  const recent = records.slice(-k);
  if (recent.length === 0) return { meanSp: 0, spPerDay: 0, samples: 0 };
  const totalSp = recent.reduce((s, r) => s + r.completedPoints, 0);
  const totalDays = recent.reduce((s, r) => s + r.availableDays, 0);
  return {
    meanSp: totalSp / recent.length,
    spPerDay: totalDays > 0 ? totalSp / totalDays : 0,
    samples: recent.length,
  };
}

export interface AvailableDaysInputs {
  sprintWorkingDays: number;
  leaves: number;
  holidays: number;
  ceremonyOverheadDays: number;
}

export function availableDays(i: AvailableDaysInputs): number {
  return Math.max(0, i.sprintWorkingDays - i.leaves - i.holidays - i.ceremonyOverheadDays);
}

export interface CapacityBand {
  point: number;
  low: number;
  high: number;
}

/**
 * Predicted team velocity = Σ (hist SP/day × available days × focus × ramp),
 * returned as a confidence band (never a single point estimate, AC-E2).
 */
export function predictedCapacity(
  spPerDay: number,
  teamSize: number,
  availDays: number,
  focusFactor: number,
  rampFactor = 1,
): CapacityBand {
  const point = spPerDay * teamSize * (availDays / 10) * focusFactor * rampFactor;
  return { point: Math.round(point), low: Math.round(point * 0.85), high: Math.round(point * 1.15) };
}

/** New-joiner ramp factor (reduced velocity for 1–2 sprints). */
export function rampFactor(employees: Employee[], onDate = '2026-06-21'): number {
  const d = new Date(onDate).getTime();
  const recent = employees.filter((e) => {
    const months = (d - new Date(e.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months >= 0 && months < 2;
  }).length;
  // each recent joiner shaves a little off team ramp
  return Math.max(0.7, 1 - recent * 0.05);
}

export function timelineSprints(featureSp: number, teamVelocity: number): number {
  if (teamVelocity <= 0) return 0;
  return Math.ceil(featureSp / teamVelocity);
}
