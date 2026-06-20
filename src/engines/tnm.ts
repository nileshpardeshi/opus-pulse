// Module B — TNM billing & forecast engine (deterministic)
import type { BillRate, Calendar, Country, TenureBand } from '../types';

export function billableDaysPerYear(holidays: number, leaves: number, weekends = 104): number {
  return Math.max(0, 365 - weekends - holidays - leaves);
}

export function billableHoursPerYear(days: number, hoursPerDay: number): number {
  return days * hoursPerDay;
}

export function annualBilling(hours: number, ratePerHour: number): number {
  return hours * ratePerHour;
}

export interface BillingInputs {
  holidays: number;
  leaves: number;
  hoursPerDay: number;
  ratePerHour: number;
}

export interface BillingResult {
  workingDays: number;
  billableDays: number;
  billableHours: number;
  annualBilling: number;
}

export function computeBilling(i: BillingInputs): BillingResult {
  const workingDays = 365 - 104 - i.holidays;
  const billableDays = billableDaysPerYear(i.holidays, i.leaves);
  const billableHours = billableHoursPerYear(billableDays, i.hoursPerDay);
  return {
    workingDays,
    billableDays,
    billableHours,
    annualBilling: annualBilling(billableHours, i.ratePerHour),
  };
}

/** Proration factor for a mid-period joiner within a year. */
export function prorationFactor(joinDate: string, periodStart = '2026-01-01', periodEnd = '2026-12-31'): number {
  const join = new Date(joinDate).getTime();
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  if (join <= start) return 1;
  if (join >= end) return 0;
  return (end - join) / (end - start);
}

export function holidayCount(calendar: Calendar | undefined, fallback: number): number {
  return calendar ? calendar.holidays.length : fallback;
}

/** Resolve the effective bill rate for a matrix key on a given date. */
export function resolveBillRate(
  rates: BillRate[],
  key: { clientId: string; role: string; location: Country; tenureBand: TenureBand },
  onDate = '2026-06-21',
): BillRate | undefined {
  const d = new Date(onDate).getTime();
  return rates
    .filter(
      (r) =>
        r.clientId === key.clientId &&
        r.role === key.role &&
        r.location === key.location &&
        r.tenureBand === key.tenureBand &&
        new Date(r.effectiveFrom).getTime() <= d &&
        (r.effectiveTo === null || new Date(r.effectiveTo).getTime() >= d),
    )
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
}
