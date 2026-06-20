import { describe, it, expect } from 'vitest';
import { computePricing, priceFloor, priceAllModels } from '../outcomePricing';
import { spEconomics } from '../spEconomics';
import { billableDaysPerYear, billableHoursPerYear, annualBilling } from '../tnm';

// BRD worked examples (Appendix A — tokenization conversion)
describe('TNM billing worked example', () => {
  it('230 billable days → 1,840 hrs → $73,600 for an India dev @ $40/hr', () => {
    const days = billableDaysPerYear(10, 21); // 365 - 104 - 10 - 21
    expect(days).toBe(230);
    const hours = billableHoursPerYear(days, 8);
    expect(hours).toBe(1840);
    expect(annualBilling(hours, 40)).toBe(73_600);
  });
});

describe('Outcome pricing worked example (tokenization)', () => {
  // 240 SP, 80 SP/sprint → 3 sprints (~1.5 months); $50k/mo billing, ~$40k/mo cost
  const inputs = {
    storyPoints: 240,
    monthlyCostUsd: 40_000,
    monthlyBillingUsd: 50_000,
    durationMonths: 1.5,
    minMarginPct: 0.18,
    targetMarginPct: 0.33,
    riskBufferPct: 0,
    milestones: 3,
  };

  it('cost-to-deliver = $60k, TNM run-rate = $75k', () => {
    const r = computePricing(inputs);
    expect(r.costToDeliver).toBe(60_000);
    expect(r.tnmRunRate).toBe(75_000);
  });

  it('recommended price ≈ $90k at ~33% margin, never below floor or TNM', () => {
    const r = computePricing(inputs);
    expect(r.recommendedPrice).toBeGreaterThanOrEqual(r.priceFloor);
    expect(r.recommendedPrice).toBeGreaterThanOrEqual(r.tnmRunRate);
    expect(r.recommendedPrice).toBeGreaterThan(88_000);
    expect(r.recommendedPrice).toBeLessThan(92_000);
    expect(r.marginPct).toBeGreaterThan(0.3);
    expect(r.marginPct).toBeLessThan(0.36);
  });

  it('price floor never undercuts cost / (1 - minMargin)', () => {
    expect(priceFloor(60_000, 0.18)).toBeCloseTo(73_170.7, 0);
  });

  it('SP economics: ~$375 rev/SP, ~33% margin/SP', () => {
    const r = computePricing(inputs);
    const e = spEconomics(r.recommendedPrice, r.costToDeliver, 240);
    expect(e.revenuePerSp).toBeGreaterThan(365);
    expect(e.revenuePerSp).toBeLessThan(385);
    expect(e.costPerSp).toBe(250);
    expect(e.marginPerSpPct).toBeGreaterThan(0.3);
  });

  it('every model price respects the floor on its fixed component', () => {
    const r = computePricing(inputs);
    const models = priceAllModels(inputs);
    models.filter((m) => m.model !== 'tnm').forEach((m) => {
      expect(m.price).toBeGreaterThanOrEqual(r.priceFloor - 1);
    });
  });
});
