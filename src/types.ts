// ─────────────────────────────────────────────────────────────────────────────
// Opus Pulse — TNM → Outcome conversion simulator (lean domain model)
// ─────────────────────────────────────────────────────────────────────────────

export type Currency = 'USD' | 'INR' | 'CAD';
export const CURRENCIES: Currency[] = ['USD', 'INR', 'CAD'];

export type DeliveryModel = 'TNM' | 'Fixed Bid' | 'Outcome Based' | 'Managed Capacity';
export const DELIVERY_MODELS: DeliveryModel[] = ['TNM', 'Fixed Bid', 'Outcome Based', 'Managed Capacity'];

export const EXPERIENCE_BANDS = ['0-3 yrs', '3-5 yrs', '5-8 yrs', '8-12 yrs', '12+ yrs'];
export const COMMON_ROLES = ['Developer', 'Senior Developer', 'Tech Lead', 'QA Engineer', 'Business Analyst', 'Architect', 'Scrum Master', 'DevOps Engineer'];

// ── Standard per-client role/experience rate card ──────────────────────────────
export interface RoleRate {
  id: string;
  role: string;
  experience: string; // one of EXPERIENCE_BANDS
  rate: number; // per hour
  currency: Currency;
}

// ── Account (client) ───────────────────────────────────────────────────────────
export interface Client {
  id: string;
  name: string;
  currency: Currency; // default billing currency for the account
  roleRates: RoleRate[];
}

// ── SOW (can be shared across projects) ────────────────────────────────────────
export interface SOW {
  id: string;
  clientId: string;
  name: string;
  model: DeliveryModel;
  startDate: string;
  endDate: string;
  owner: string;
}

// ── Project (references a SOW) ─────────────────────────────────────────────────
export interface Project {
  id: string;
  clientId: string;
  name: string;
  sowId: string;
  teamSize: number;
  hoursPerDay: 8 | 9;
}

// ── Billing simulator config (per project) ─────────────────────────────────────
export interface ResourceLine {
  id: string;
  role: string;
  experience: string;
  count: number;
  rate: number; // billing rate / hour
  costRate: number; // internal cost / hour (for margin)
  currency: Currency;
}

export interface ExpenseLine {
  id: string;
  category: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  currency: Currency;
}

export interface BillingConfig {
  projectId: string;
  resources: ResourceLine[];
  hoursPerDay: number;
  annualLeaves: number;
  nationalHolidays: number;
  expenses: ExpenseLine[];
}

// ── Resource Mix Optimizer (the resource-shuffle simulation) ───────────────────
export interface MixSwap {
  count: number; // how many of this resource line to swap to a fresher
  fresherCostRate: number; // fresher cost/hr in the account currency
}
export interface MixConfig {
  fresherVelocityPct: number; // fresher delivers this fraction of a regular member (e.g. 0.65)
  fresherReworkPct: number; // extra rework from freshers (e.g. 0.10)
  swaps: Record<string, MixSwap>; // keyed by billing ResourceLine id
}

// ── Outcome simulator config (per project) ─────────────────────────────────────
export interface OutcomeConfig {
  projectId: string;
  hoursPerStoryPoint: number; // 1 SP = X working hours (effort view)
  sprintsPerMonth: number; // invoicing cadence (2 sprints / month)
  reservePct: number; // capacity held for issues / meetings / grooming (e.g. 0.15)
  caseACapacity: number; // SP per person per sprint — Case 1 (e.g. 7)
  caseBCapacity: number; // SP per person per sprint — Case 2 (e.g. 8)
  efficiencyGainPct: number; // outcome-only efficiency (mainly from leaner resource mix)
  clientDiscountPct: number; // discount offered to the client vs their TNM cost/SP (the share-back)
  minInvoiceSp: number; // minimum SP to trigger an invoice (customizable, not mandatory)
  mix: MixConfig; // resource-shuffle modeler that grounds the efficiency %
}
