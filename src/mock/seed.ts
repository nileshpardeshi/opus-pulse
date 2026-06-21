import type { BillingConfig, Client, OutcomeConfig, Project, ResourceLine, SOW } from '../types';

let n = 0;
const id = (p: string) => `${p}_${(n += 1)}`;

// ── Accounts (clients) with standard role/experience rate cards ────────────────
export const clients: Client[] = [
  {
    id: 'cli_mastercard',
    name: 'Apex Bank',
    currency: 'USD',
    roleRates: [
      { id: id('rr'), role: 'Sr Dev', experience: '5 to 8', rate: 28, currency: 'USD' },
      { id: id('rr'), role: 'Sr Dev', experience: '8 to 10', rate: 30, currency: 'USD' },
      { id: id('rr'), role: 'Tech Lead (Dev)', experience: '9 to 12', rate: 35, currency: 'USD' },
      { id: id('rr'), role: 'Sr QA', experience: '5 to 8', rate: 28, currency: 'USD' },
      { id: id('rr'), role: 'Lead QA', experience: '9 to 12', rate: 35, currency: 'USD' },
      { id: id('rr'), role: 'PO', experience: '12 to 14', rate: 37, currency: 'USD' },
    ],
  },
  {
    id: 'cli_hdfc',
    name: 'Orion Bank',
    currency: 'INR',
    roleRates: [
      { id: id('rr'), role: 'Developer', experience: '3-5 yrs', rate: 1800, currency: 'INR' },
      { id: id('rr'), role: 'Senior Developer', experience: '5-8 yrs', rate: 2800, currency: 'INR' },
      { id: id('rr'), role: 'Tech Lead', experience: '8-12 yrs', rate: 4200, currency: 'INR' },
      { id: id('rr'), role: 'QA Engineer', experience: '3-5 yrs', rate: 1600, currency: 'INR' },
    ],
  },
];

// ── SOWs (can be shared across projects) ───────────────────────────────────────
export const sows: SOW[] = [
  { id: 'sow_pg', clientId: 'cli_mastercard', name: 'SOW-2024-Payments', model: 'TNM', startDate: '2024-01-01', endDate: '2026-12-31', owner: 'Priya Menon' },
  { id: 'sow_fa', clientId: 'cli_mastercard', name: 'SOW-2024-Analytics', model: 'TNM', startDate: '2024-04-01', endDate: '2026-03-31', owner: 'David Cole' },
  { id: 'sow_tkn', clientId: 'cli_mastercard', name: 'SOW-2025-Tokenization', model: 'Outcome Based', startDate: '2025-06-01', endDate: '2026-12-31', owner: 'Lena Ortiz' },
  { id: 'sow_hdfc', clientId: 'cli_hdfc', name: 'SOW-2024-CoreBank', model: 'TNM', startDate: '2024-07-01', endDate: '2026-06-30', owner: 'Anita Rao' },
];

export const projects: Project[] = [
  { id: 'prj_pg', clientId: 'cli_mastercard', name: 'Payments Gateway', sowId: 'sow_pg', teamSize: 10, hoursPerDay: 8 },
  { id: 'prj_fa', clientId: 'cli_mastercard', name: 'Fraud Analytics', sowId: 'sow_fa', teamSize: 7, hoursPerDay: 8 },
  { id: 'prj_tkn', clientId: 'cli_mastercard', name: 'Tokenization Platform', sowId: 'sow_tkn', teamSize: 8, hoursPerDay: 8 },
  { id: 'prj_hdfc', clientId: 'cli_hdfc', name: 'Core Banking Upgrade', sowId: 'sow_hdfc', teamSize: 9, hoursPerDay: 9 },
];

// ── A seeded billing config for the lead project so screens show data at once ──
function rl(role: string, exp: string, count: number, rate: number): ResourceLine {
  return { id: id('res'), role, experience: exp, count, rate, costRate: Math.round(rate * 0.6), currency: 'USD' };
}

export const billingConfigs: Record<string, BillingConfig> = {
  prj_pg: {
    projectId: 'prj_pg',
    hoursPerDay: 8,
    annualLeaves: 21,
    nationalHolidays: 10,
    // team from the example: 10 resources, blended $314/hr
    resources: [
      rl('Sr Dev', '5 to 8', 3, 28),
      rl('Sr Dev', '8 to 10', 2, 30),
      rl('Tech Lead (Dev)', '9 to 12', 1, 35),
      rl('Sr QA', '5 to 8', 1, 28),
      rl('Lead QA', '9 to 12', 2, 35),
      rl('PO', '12 to 14', 1, 37),
    ],
    // expenses tuned to ~40% TNM margin (≈ $28.9k/mo cost vs $48.1k/mo billing)
    expenses: [
      { id: id('exp'), category: 'Salaries', amount: 24000, frequency: 'monthly', currency: 'USD' },
      { id: id('exp'), category: 'Infrastructure / seats', amount: 2500, frequency: 'monthly', currency: 'USD' },
      { id: id('exp'), category: 'Software licenses', amount: 1200, frequency: 'monthly', currency: 'USD' },
      { id: id('exp'), category: 'Travel', amount: 700, frequency: 'monthly', currency: 'USD' },
      { id: id('exp'), category: 'Training', amount: 6000, frequency: 'yearly', currency: 'USD' },
    ],
  },
};

export const outcomeConfigs: Record<string, OutcomeConfig> = {
  prj_pg: {
    projectId: 'prj_pg',
    hoursPerStoryPoint: 12.8,
    sprintsPerMonth: 2,
    reservePct: 0.15,
    caseACapacity: 7,
    caseBCapacity: 8,
    efficiencyGainPct: 0.1,
    clientDiscountPct: 0.05,
    minInvoiceSp: 120,
    mix: { fresherVelocityPct: 0.65, fresherReworkPct: 0.1, swaps: {} },
  },
};

export interface SeedData {
  clients: Client[];
  sows: SOW[];
  projects: Project[];
  billingConfigs: Record<string, BillingConfig>;
  outcomeConfigs: Record<string, OutcomeConfig>;
}

export function buildSeed(): SeedData {
  // deep clone so resets are clean
  return JSON.parse(JSON.stringify({ clients, sows, projects, billingConfigs, outcomeConfigs }));
}
