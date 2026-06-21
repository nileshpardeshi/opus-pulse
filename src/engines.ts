import type { BillingConfig, Currency, ResourceLine } from './types';
import { convert, round } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// BILLING SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────
export function billableDaysPerYear(holidays: number, leaves: number): number {
  return Math.max(0, 365 - 104 - holidays - leaves);
}

export interface ResourceBilling {
  line: ResourceLine;
  billableHoursYear: number;
  yearlyRevenue: number; // in account currency
  yearlyCost: number; // resource internal cost (hrs × costRate)
}

export interface BillingResult {
  billableDays: number;
  billableHoursPerResource: number;
  resources: ResourceBilling[];
  headcount: number;
  yearlyRevenue: number;
  monthlyRevenue: number;
  yearlyExpenses: number;
  monthlyExpenses: number;
  yearlyProfit: number;
  monthlyProfit: number;
  marginPct: number;
  expenseByCategory: { category: string; yearly: number }[];
  currency: Currency;
}

export function computeBilling(cfg: BillingConfig, currency: Currency): BillingResult {
  const billableDays = billableDaysPerYear(cfg.nationalHolidays, cfg.annualLeaves);
  const hoursPerResource = billableDays * cfg.hoursPerDay;

  const resources: ResourceBilling[] = cfg.resources.map((line) => {
    const rate = convert(line.rate, line.currency, currency);
    const costRate = convert(line.costRate, line.currency, currency);
    return {
      line,
      billableHoursYear: hoursPerResource,
      yearlyRevenue: hoursPerResource * rate * line.count,
      yearlyCost: hoursPerResource * costRate * line.count,
    };
  });

  const yearlyRevenue = resources.reduce((s, r) => s + r.yearlyRevenue, 0);
  const headcount = cfg.resources.reduce((s, r) => s + r.count, 0);

  const expenseByCategory = cfg.expenses.map((e) => ({
    category: e.category,
    yearly: convert(e.amount, e.currency, currency) * (e.frequency === 'monthly' ? 12 : 1),
  }));
  const yearlyExpenses = expenseByCategory.reduce((s, e) => s + e.yearly, 0);

  const yearlyProfit = yearlyRevenue - yearlyExpenses;
  return {
    billableDays,
    billableHoursPerResource: hoursPerResource,
    resources,
    headcount,
    yearlyRevenue: round(yearlyRevenue),
    monthlyRevenue: round(yearlyRevenue / 12),
    yearlyExpenses: round(yearlyExpenses),
    monthlyExpenses: round(yearlyExpenses / 12),
    yearlyProfit: round(yearlyProfit),
    monthlyProfit: round(yearlyProfit / 12),
    marginPct: yearlyRevenue > 0 ? yearlyProfit / yearlyRevenue : 0,
    expenseByCategory,
    currency,
  };
}

// ── Module: Resource Mix Optimizer (resource shuffle -> net efficiency %) ──────
export interface MixSwapInput { count: number; fresherCostRate: number; }
export interface MixInputs {
  resources: ResourceLine[];
  swaps: Record<string, MixSwapInput>;
  fresherVelocityPct: number; // fresher delivers this fraction of a regular member
  fresherReworkPct: number; // extra rework from freshers
  currency: Currency;
}
export interface MixResult {
  origCostPerHour: number; // Σ count × cost-rate (account ccy)
  newCostPerHour: number;
  costChangePct: number; // negative = cheaper
  headcount: number;
  newUnits: number; // effective delivery capacity after the swap (in "regular member" units)
  velocityChangePct: number; // negative = slower
  origCostPerUnit: number;
  newCostPerUnit: number;
  netEfficiencyPct: number; // cheaper-per-delivered-unit, net of velocity loss + rework
  swappedCount: number;
  currency: Currency;
}

/**
 * Models swapping higher-cost resources for freshers. Freshers are cheaper but
 * slower (velocity factor) and need more rework. Returns the NET efficiency per
 * delivered unit of work — the honest number to feed the outcome efficiency lever.
 */
export function computeMix(i: MixInputs): MixResult {
  const fresherUnit = i.fresherVelocityPct / (1 + i.fresherReworkPct); // net output of a fresher vs a regular
  let origCost = 0, newCost = 0, headcount = 0, newUnits = 0, swapped = 0;
  i.resources.forEach((r) => {
    const cr = convert(r.costRate, r.currency, i.currency);
    headcount += r.count;
    origCost += r.count * cr;
    const sw = i.swaps[r.id];
    const n = sw ? Math.min(Math.max(0, sw.count), r.count) : 0;
    const fc = sw ? sw.fresherCostRate : cr;
    swapped += n;
    const reg = r.count - n;
    newCost += reg * cr + n * fc;
    newUnits += reg + n * fresherUnit;
  });
  const origUnits = headcount;
  const origCostPerUnit = origUnits ? origCost / origUnits : 0;
  const newCostPerUnit = newUnits ? newCost / newUnits : 0;
  return {
    origCostPerHour: round(origCost, 2),
    newCostPerHour: round(newCost, 2),
    costChangePct: origCost ? newCost / origCost - 1 : 0,
    headcount,
    newUnits: round(newUnits, 2),
    velocityChangePct: origUnits ? newUnits / origUnits - 1 : 0,
    origCostPerUnit: round(origCostPerUnit, 2),
    newCostPerUnit: round(newCostPerUnit, 2),
    netEfficiencyPct: newCostPerUnit ? origCostPerUnit / newCostPerUnit - 1 : 0,
    swappedCount: swapped,
    currency: i.currency,
  };
}

// ── AI margin advisory (rules-based) ──────────────────────────────────────────
export interface MarginAdvice {
  marginPct: number;
  health: 'strong' | 'healthy' | 'thin' | 'loss';
  opportunities: string[];
  leaks: string[];
}

export function marginAdvice(b: BillingResult, cfg: BillingConfig): MarginAdvice {
  const opportunities: string[] = [];
  const leaks: string[] = [];
  const cur = b.currency;

  const health = b.marginPct >= 0.3 ? 'strong' : b.marginPct >= 0.2 ? 'healthy' : b.marginPct >= 0 ? 'thin' : 'loss';

  // ── leaks ──
  const sorted = [...b.expenseByCategory].sort((x, y) => y.yearly - x.yearly);
  sorted.forEach((e) => {
    const pct = b.yearlyRevenue > 0 ? e.yearly / b.yearlyRevenue : 0;
    if (e.category.toLowerCase() !== 'salaries' && pct > 0.06) {
      leaks.push(`${e.category} is ${(pct * 100).toFixed(1)}% of revenue — review for savings.`);
    }
  });
  // resource-level negative margin
  b.resources.forEach((r) => {
    if (r.yearlyCost > r.yearlyRevenue) {
      leaks.push(`${r.line.role} (${r.line.experience}) bills below its internal cost — rate revision needed.`);
    }
  });
  if (cfg.annualLeaves + cfg.nationalHolidays > 40) {
    leaks.push(`High non-billable days (${cfg.annualLeaves + cfg.nationalHolidays}/yr) reduce billable hours.`);
  }

  // ── opportunities ──
  if (b.marginPct < 0.25) {
    opportunities.push('Margin is below 25% — pursue a client rate revision on the next SOW renewal.');
  }
  const juniorHeavy = b.resources.filter((r) => r.line.experience.startsWith('8') || r.line.experience.startsWith('12')).reduce((s, r) => s + r.line.count, 0);
  const total = b.headcount || 1;
  if (juniorHeavy / total > 0.3) {
    opportunities.push('Senior-heavy mix — consider swapping some senior roles for mid-level to lift margin.');
  }
  opportunities.push(`Converting this engagement to Outcome-Based could retain efficiency gains as margin (see the Outcome Simulator).`);
  const biggestLeak = sorted.find((e) => e.category.toLowerCase() !== 'salaries');
  if (biggestLeak) {
    opportunities.push(`Trimming "${biggestLeak.category}" by 20% adds ~${(biggestLeak.yearly * 0.2 / 1000).toFixed(1)}k ${cur}/yr to profit.`);
  }

  return { marginPct: b.marginPct, health, opportunities, leaks: leaks.length ? leaks : ['No material margin leaks detected.'] };
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME SIMULATOR — capacity-based two-case model + client win-win
// ─────────────────────────────────────────────────────────────────────────────
export interface OutcomeCaseInput {
  label: string;
  perPersonSp: number; // SP per person per sprint
  headcount: number;
  reservePct: number; // capacity held for issues/meetings/grooming
  sprintsPerMonth: number; // invoicing cadence
  monthlyRevenueTnm: number; // R — what the client pays under TNM (= billing revenue)
  monthlyCost: number; // C — Opus delivery cost (= billing expenses)
  efficiencyGainPct: number; // g — outcome-only efficiency (accelerators/reuse/cheaper mix)
  clientDiscountPct: number; // d — discount shared with the client vs their TNM cost/SP
  minInvoiceSp: number;
}

export interface OutcomeCaseResult {
  label: string;
  grossVelocity: number; // per sprint, before reserve
  effectiveVelocity: number; // per sprint, after reserve
  monthlySp: number; // delivered per month (2 sprints)
  meetsMin: boolean;
  // pricing
  breakEvenPerSp: number; // R / monthlySp  (= client's TNM cost per delivered SP)
  pricePerSp: number; // recommended outcome rate = breakEven × (1 − d)
  monthlyBill: number; // price × monthlySp
  yearlyBill: number;
  // Opus economics
  tnmMarginPct: number; // (R − C)/R
  outcomeCost: number; // C / (1 + g)
  outcomeMarginPct: number; // (bill − outcomeCost)/bill
  marginUpliftPts: number;
  opusYearlyProfitTnm: number;
  opusYearlyProfitOutcome: number;
  // Client economics
  clientTnmCostPerSp: number;
  clientMonthlySaving: number; // R − bill
  clientYearlySaving: number;
  // win-win flag
  winWin: boolean;
  currency: Currency;
}

export function computeOutcomeCase(i: OutcomeCaseInput, currency: Currency): OutcomeCaseResult {
  const gross = i.perPersonSp * i.headcount;
  const eff = gross * (1 - i.reservePct);
  const monthlySp = eff * i.sprintsPerMonth;
  const R = i.monthlyRevenueTnm;
  const C = i.monthlyCost;

  const breakEven = monthlySp > 0 ? R / monthlySp : 0;
  const price = breakEven * (1 - i.clientDiscountPct);
  const bill = price * monthlySp; // = R(1 − d)
  const outcomeCost = C / (1 + i.efficiencyGainPct);

  const tnmMargin = R > 0 ? (R - C) / R : 0;
  const outcomeMargin = bill > 0 ? (bill - outcomeCost) / bill : 0;

  return {
    label: i.label,
    grossVelocity: round(gross, 1),
    effectiveVelocity: round(eff, 1),
    monthlySp: round(monthlySp),
    meetsMin: monthlySp >= i.minInvoiceSp,
    breakEvenPerSp: round(breakEven),
    pricePerSp: round(price),
    monthlyBill: round(bill),
    yearlyBill: round(bill * 12),
    tnmMarginPct: tnmMargin,
    outcomeCost: round(outcomeCost),
    outcomeMarginPct: outcomeMargin,
    marginUpliftPts: (outcomeMargin - tnmMargin) * 100,
    opusYearlyProfitTnm: round((R - C) * 12),
    opusYearlyProfitOutcome: round((bill - outcomeCost) * 12),
    clientTnmCostPerSp: round(breakEven),
    clientMonthlySaving: round(R - bill),
    clientYearlySaving: round((R - bill) * 12),
    // genuine win-win: client pays less AND Opus's absolute profit is not lower
    winWin: bill < R - 0.5 && (bill - outcomeCost) >= R - C - 0.5,
    currency,
  };
}

// ── AI analytics: explain the win-win (or warn when it doesn't hold) ───────────
export interface OutcomeInsight {
  headline: string;
  winWin: boolean;
  points: string[];
  clientBenefits: string[];
}

export function outcomeInsight(c: OutcomeCaseResult): OutcomeInsight {
  const cur = c.currency;
  const opusExtraYr = c.opusYearlyProfitOutcome - c.opusYearlyProfitTnm;
  const points: string[] = [];
  if (c.winWin) {
    points.push(`Client pays ${fmtMoneyShort(c.monthlyBill, cur)}/mo vs ${fmtMoneyShort(c.monthlyBill + c.clientMonthlySaving, cur)} under TNM — saving ${fmtMoneyShort(c.clientMonthlySaving, cur)}/mo (${fmtMoneyShort(c.clientYearlySaving, cur)}/yr).`);
    points.push(`Opus earns ${fmtMoneyShort(opusExtraYr, cur)}/yr MORE profit while charging less — margin ${(c.tnmMarginPct * 100).toFixed(1)}% → ${(c.outcomeMarginPct * 100).toFixed(1)}% (+${c.marginUpliftPts.toFixed(1)} pts).`);
    points.push(`The surplus comes from efficiency Opus keeps under outcome (accelerators / reuse / lower-cost mix) — which TNM would have returned to the client as fewer billed hours.`);
  } else {
    points.push(`At these levers the ${(c.clientMonthlySaving > 0 ? 'client discount exceeds the efficiency saving — Opus profit would dip' : 'client pays the same or more')}. Raise the efficiency gain or lower the client discount to reach a genuine win-win.`);
  }
  const clientBenefits = [
    'Price certainty — a fixed rate per accepted point; no exposure to rate hikes or slippage.',
    'Pay only for accepted output — rework, bug-fixing and the 20% meeting/grooming reserve are no longer the client’s cost.',
    'Risk transfer — attrition, ramp-up and estimation risk sit with Opus, not the client.',
    'Throughput commitment — a delivery SLA instead of an open-ended timesheet.',
    'Lower management overhead — the client governs outcomes, not headcount/utilisation.',
  ];
  return {
    headline: c.winWin
      ? `Win-win: client saves ${fmtMoneyShort(c.clientYearlySaving, cur)}/yr AND Opus margin +${c.marginUpliftPts.toFixed(1)} pts`
      : `Not yet a win-win — adjust the efficiency / discount levers`,
    winWin: c.winWin,
    points,
    clientBenefits,
  };
}

function fmtMoneyShort(amount: number, currency: Currency): string {
  const sym = { USD: '$', INR: '₹', CAD: 'C$' }[currency];
  const a = Math.abs(amount);
  if (a >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sym}${(amount / 1_000).toFixed(1)}k`;
  return `${sym}${Math.round(amount)}`;
}
