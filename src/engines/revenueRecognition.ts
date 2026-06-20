// Module L — Revenue Recognition & WIP (deterministic)
import type { Milestone, RevenueRecognitionRecord } from '../types';
import { convert, round } from '../utils';

export interface RevRecSummary {
  recognized: number;
  billed: number;
  wipUnbilled: number;
  deferred: number;
}

export function summarizeRevRec(records: RevenueRecognitionRecord[], baseCurrency: 'USD' | 'INR' | 'GBP' | 'CAD' = 'USD'): RevRecSummary {
  return records.reduce<RevRecSummary>(
    (acc, r) => ({
      recognized: acc.recognized + convert(r.recognized.amount, r.recognized.currency, baseCurrency),
      billed: acc.billed + convert(r.billed.amount, r.billed.currency, baseCurrency),
      wipUnbilled: acc.wipUnbilled + convert(r.wipUnbilled.amount, r.wipUnbilled.currency, baseCurrency),
      deferred: acc.deferred + convert(r.deferred.amount, r.deferred.currency, baseCurrency),
    }),
    { recognized: 0, billed: 0, wipUnbilled: 0, deferred: 0 },
  );
}

export interface AcceptanceAgeing {
  milestone: Milestone;
  daysOverdue: number;
  cashFlowRisk: boolean;
}

export function acceptanceAgeing(milestones: Milestone[], today = '2026-06-21'): AcceptanceAgeing[] {
  const now = new Date(today).getTime();
  return milestones
    .filter((m) => m.acceptanceStatus !== 'accepted')
    .map((m) => {
      const due = new Date(m.dueDate).getTime();
      const daysOverdue = round((now - due) / (1000 * 60 * 60 * 24));
      return { milestone: m, daysOverdue, cashFlowRisk: m.acceptanceStatus === 'delivered' || daysOverdue > -14 };
    });
}

/** Recognize on acceptance: accepted milestones contribute recognized revenue. */
export function recognizedFromMilestones(milestones: Milestone[], baseCurrency: 'USD' | 'INR' | 'GBP' | 'CAD' = 'USD'): number {
  return milestones
    .filter((m) => m.acceptanceStatus === 'accepted')
    .reduce((s, m) => s + convert(m.price.amount, m.price.currency, baseCurrency), 0);
}
