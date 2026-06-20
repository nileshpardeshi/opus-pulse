import type {
  Accelerator,
  Alert,
  Allocation,
  Approval,
  AppraisalCycle,
  AssetApplication,
  AuditEvent,
  BillRate,
  Calendar,
  ChangeRequest,
  Client,
  CostComponent,
  CostLineItem,
  Country,
  CurrencyCode,
  Deal,
  Employee,
  Feature,
  FxRate,
  LeaveRecord,
  Milestone,
  Project,
  RevenueRecognitionRecord,
  Scenario,
  Sprint,
  SOW,
  Team,
  TenureBand,
  User,
  UtilizationRecord,
  VelocityRecord,
} from '../types';
import { money } from '../utils';

// Loading factors applied to base salary to produce itemised cost line items.
const LOADING: Record<Exclude<CostComponent, 'base_salary'>, number> = {
  variable_pay: 0.1,
  employer_statutory: 0.12,
  insurance: 0.03,
  infrastructure: 0.05,
  hardware: 0.02,
  software_licenses: 0.02,
  training: 0.01,
  travel: 0.01,
  allocated_overhead: 0.08,
  bench_allocation: 0.05,
};

function costLineItems(base: number): CostLineItem[] {
  const items: CostLineItem[] = [{ component: 'base_salary', value: base }];
  (Object.keys(LOADING) as Array<keyof typeof LOADING>).forEach((k) => {
    items.push({ component: k, value: Math.round(base * LOADING[k]) });
  });
  return items;
}

let n = 0;
const id = (p: string) => `${p}_${(n += 1)}`;

function tenure(joinYear: number): TenureBand {
  const yrs = 2026 - joinYear;
  if (yrs < 2) return '0-2';
  if (yrs < 5) return '2-5';
  if (yrs < 10) return '5-10';
  return '10+';
}

function emp(
  name: string,
  role: string,
  level: string,
  country: Country,
  currency: CurrencyCode,
  base: number,
  joinYear: number,
  teamId: string,
  status: Employee['status'] = 'active',
): Employee {
  return {
    id: id('emp'),
    name,
    role,
    level,
    country,
    currency,
    baseSalary: base,
    joinDate: `${joinYear}-04-01`,
    status,
    tenureBand: tenure(joinYear),
    costLineItems: costLineItems(base),
    teamId,
  };
}

const FIRST = ['Aarav', 'Diya', 'Rohan', 'Isha', 'Karan', 'Neha', 'Vivaan', 'Anaya', 'Arjun', 'Sara', 'Liam', 'Emma', 'Noah', 'Olivia', 'James', 'Ava', 'Lucas', 'Mia', 'Ethan', 'Sophia'];
const LAST = ['Sharma', 'Patel', 'Nair', 'Rao', 'Singh', 'Iyer', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Taylor', 'Clark'];
let nameIdx = 0;
const nextName = () => `${FIRST[nameIdx % FIRST.length]} ${LAST[(nameIdx++ ) % LAST.length]}`;

const ROLES = ['Engineer', 'Sr. Engineer', 'Tech Lead', 'QA Engineer', 'Business Analyst'];
const LEVELS = ['L2', 'L3', 'L4', 'L3', 'L2'];

// ── Clients ──────────────────────────────────────────────────────────────────
export const clients: Client[] = [
  { id: 'cli_meridian', name: 'Meridian Bank', region: 'UK', industry: 'Banking', tier: 'strategic' },
  { id: 'cli_atlas', name: 'Atlas Retail', region: 'US', industry: 'Retail', tier: 'growth' },
  { id: 'cli_nordic', name: 'Nordic Logistics', region: 'EU', industry: 'Logistics', tier: 'standard' },
  { id: 'cli_helios', name: 'Helios Health', region: 'US', industry: 'Healthcare', tier: 'growth' },
  { id: 'cli_quantia', name: 'Quantia Insurance', region: 'Canada', industry: 'Insurance', tier: 'strategic' },
];

// ── Teams & projects ───────────────────────────────────────────────────────────
interface ProjectSpec {
  projectId: string;
  teamId: string;
  clientId: string;
  name: string;
  model: SOW['modelType'];
  monthlyBilling: number; // USD
  size: number; // team size
  country: Country;
  currency: CurrencyCode;
  base: number; // base salary in currency
  spToHours: number;
  appraisalHikePct: number;
  status: Project['status'];
  priceCurrency: CurrencyCode;
}

const specs: ProjectSpec[] = [
  { projectId: 'prj_token', teamId: 'team_token', clientId: 'cli_meridian', name: 'Tokenization Platform', model: 'tnm', monthlyBilling: 50_000, size: 10, country: 'India', currency: 'INR', base: 2_650_000, spToHours: 5, appraisalHikePct: 0.07, status: 'at-risk', priceCurrency: 'GBP' },
  { projectId: 'prj_atlas', teamId: 'team_atlas', clientId: 'cli_atlas', name: 'Atlas Commerce Re-platform', model: 'tnm', monthlyBilling: 180_000, size: 8, country: 'US', currency: 'USD', base: 145_000, spToHours: 6, appraisalHikePct: 0.05, status: 'active', priceCurrency: 'USD' },
  { projectId: 'prj_nordic', teamId: 'team_nordic', clientId: 'cli_nordic', name: 'Nordic Fleet Tracking', model: 'managed-capacity', monthlyBilling: 72_000, size: 7, country: 'India', currency: 'INR', base: 2_900_000, spToHours: 5.5, appraisalHikePct: 0.07, status: 'active', priceCurrency: 'USD' },
  { projectId: 'prj_helios', teamId: 'team_helios', clientId: 'cli_helios', name: 'Helios Patient Portal', model: 'gain-share', monthlyBilling: 96_000, size: 6, country: 'US', currency: 'USD', base: 138_000, spToHours: 6.5, appraisalHikePct: 0.05, status: 'active', priceCurrency: 'USD' },
  { projectId: 'prj_quantia', teamId: 'team_quantia', clientId: 'cli_quantia', name: 'Quantia Claims Engine', model: 'outcome', monthlyBilling: 88_000, size: 6, country: 'India', currency: 'INR', base: 3_050_000, spToHours: 5, appraisalHikePct: 0.07, status: 'active', priceCurrency: 'CAD' },
];

export const teams: Team[] = specs.map((s) => ({ id: s.teamId, name: s.name + ' Team', projectId: s.projectId, spToHours: s.spToHours }));

export const employees: Employee[] = [];
specs.forEach((s) => {
  for (let i = 0; i < s.size; i += 1) {
    const role = ROLES[i % ROLES.length];
    const level = LEVELS[i % LEVELS.length];
    const joinYear = 2018 + (i % 7);
    // a couple of benched resources for the utilization screen
    const status: Employee['status'] = s.teamId === 'team_atlas' && i >= s.size - 1 ? 'on-bench' : 'active';
    employees.push(emp(nextName(), role, level, s.country, s.currency, Math.round(s.base * (1 + (i % 5) * 0.05)), joinYear, s.teamId, status));
  }
});

export const sows: SOW[] = specs.map((s) => ({
  id: `sow_${s.projectId}`,
  clientId: s.clientId,
  modelType: s.model,
  hoursPerDay: 8,
  fxPolicy: 'period-rate',
  marginFloorPct: 0.15,
  minMarginPct: 0.18,
  priceCurrency: s.priceCurrency,
  startDate: '2022-04-01',
  endDate: '2026-12-31',
}));

export const projects: Project[] = specs.map((s) => ({
  id: s.projectId,
  sowId: `sow_${s.projectId}`,
  clientId: s.clientId,
  name: s.name,
  monthlyBilling: money(s.monthlyBilling, 'USD'),
  status: s.status,
  teamId: s.teamId,
  appraisalHikePct: s.appraisalHikePct,
}));

// ── Allocations ────────────────────────────────────────────────────────────────
export const allocations: Allocation[] = employees.map((e) => {
  const spec = specs.find((s) => s.teamId === e.teamId)!;
  const billable = e.status === 'active';
  return {
    id: id('alloc'),
    projectId: spec.projectId,
    employeeId: e.id,
    allocationPct: billable ? (e.role === 'Tech Lead' ? 0.8 : 1) : 0,
    billable,
    startDate: e.joinDate,
    endDate: null,
  };
});

// ── Bill rates ───────────────────────────────────────────────────────────────
const RATE_BY_COUNTRY: Record<Country, number> = { India: 40, US: 175, UK: 165, Canada: 150 };
export const billRates: BillRate[] = [];
clients.forEach((c) => {
  (['India', 'US', 'UK', 'Canada'] as Country[]).forEach((loc) => {
    ROLES.forEach((role) => {
      (['0-2', '2-5', '5-10', '10+'] as TenureBand[]).forEach((band) => {
        const bump = { '0-2': 0.85, '2-5': 1, '5-10': 1.15, '10+': 1.3 }[band];
        billRates.push({
          id: id('rate'),
          clientId: c.id,
          role,
          location: loc,
          tenureBand: band,
          rate: Math.round(RATE_BY_COUNTRY[loc] * bump),
          currency: loc === 'India' ? 'INR' : loc === 'UK' ? 'GBP' : loc === 'Canada' ? 'CAD' : 'USD',
          effectiveFrom: '2022-04-01',
          effectiveTo: null,
        });
      });
    });
  });
});
// one future-dated revision on Meridian to demo effective-dating (AC-A1)
billRates.push({ id: id('rate'), clientId: 'cli_meridian', role: 'Sr. Engineer', location: 'India', tenureBand: '5-10', rate: 52, currency: 'INR', effectiveFrom: '2026-10-01', effectiveTo: null });

// ── Calendars & leave ───────────────────────────────────────────────────────────
export const calendars: Calendar[] = [
  { country: 'India', weekendDays: [0, 6], defaultAnnualLeaves: 21, holidays: [
    { date: '2026-01-26', name: 'Republic Day' }, { date: '2026-03-25', name: 'Holi' }, { date: '2026-08-15', name: 'Independence Day' }, { date: '2026-10-02', name: 'Gandhi Jayanti' }, { date: '2026-11-08', name: 'Diwali' },
  ] },
  { country: 'US', weekendDays: [0, 6], defaultAnnualLeaves: 15, holidays: [
    { date: '2026-01-01', name: 'New Year' }, { date: '2026-07-04', name: 'Independence Day' }, { date: '2026-11-26', name: 'Thanksgiving' }, { date: '2026-12-25', name: 'Christmas' },
  ] },
  { country: 'UK', weekendDays: [0, 6], defaultAnnualLeaves: 25, holidays: [
    { date: '2026-01-01', name: 'New Year' }, { date: '2026-12-25', name: 'Christmas' }, { date: '2026-12-26', name: 'Boxing Day' },
  ] },
  { country: 'Canada', weekendDays: [0, 6], defaultAnnualLeaves: 20, holidays: [
    { date: '2026-07-01', name: 'Canada Day' }, { date: '2026-12-25', name: 'Christmas' },
  ] },
];

export const leaveRecords: LeaveRecord[] = employees.map((e) => ({ id: id('leave'), employeeId: e.id, days: 12 + (n % 10), year: 2026 }));

// ── Features & milestones ─────────────────────────────────────────────────────
export const features: Feature[] = [
  { id: 'feat_token', projectId: 'prj_token', name: 'Tokenization Engine', sizeStoryPoints: 240, riskBufferPct: 0.15 },
  { id: 'feat_token_kyc', projectId: 'prj_token', name: 'KYC Onboarding Flow', sizeStoryPoints: 120, riskBufferPct: 0.15 },
  { id: 'feat_atlas_cart', projectId: 'prj_atlas', name: 'Headless Cart', sizeStoryPoints: 180, riskBufferPct: 0.12 },
  { id: 'feat_nordic_track', projectId: 'prj_nordic', name: 'Real-time Tracking', sizeStoryPoints: 160, riskBufferPct: 0.15 },
  { id: 'feat_helios_portal', projectId: 'prj_helios', name: 'Patient Scheduling', sizeStoryPoints: 140, riskBufferPct: 0.18 },
  { id: 'feat_quantia_claims', projectId: 'prj_quantia', name: 'Auto-adjudication', sizeStoryPoints: 200, riskBufferPct: 0.2 },
];

export const milestones: Milestone[] = [
  { id: id('ms'), featureId: 'feat_token', name: 'M1 — Core ledger', storyPoints: 80, price: money(30_000, 'GBP'), acceptanceStatus: 'accepted', dueDate: '2026-05-15', acceptedDate: '2026-05-14' },
  { id: id('ms'), featureId: 'feat_token', name: 'M2 — Token minting', storyPoints: 80, price: money(30_000, 'GBP'), acceptanceStatus: 'delivered', dueDate: '2026-06-30' },
  { id: id('ms'), featureId: 'feat_token', name: 'M3 — Settlement', storyPoints: 80, price: money(30_000, 'GBP'), acceptanceStatus: 'in-progress', dueDate: '2026-08-15' },
  { id: id('ms'), featureId: 'feat_quantia_claims', name: 'M1 — Rules engine', storyPoints: 100, price: money(60_000, 'CAD'), acceptanceStatus: 'accepted', dueDate: '2026-04-30', acceptedDate: '2026-04-28' },
  { id: id('ms'), featureId: 'feat_quantia_claims', name: 'M2 — Adjudication', storyPoints: 100, price: money(60_000, 'CAD'), acceptanceStatus: 'pending', dueDate: '2026-07-31' },
];

// ── Sprints & velocity (last 6 sprints/team) ────────────────────────────────────
export const sprints: Sprint[] = [];
export const velocityRecords: VelocityRecord[] = [];
specs.forEach((s) => {
  // target team velocity ~ size * 8 (tokenization 10 -> ~80)
  const target = s.size * 8;
  for (let i = 0; i < 6; i += 1) {
    const sp: Sprint = { id: id('spr'), projectId: s.projectId, index: i + 1, startDate: '2026-01-01', endDate: '2026-01-14' };
    sprints.push(sp);
    const jitter = [0.92, 1.05, 0.97, 1.0, 1.08, 0.95][i];
    velocityRecords.push({ id: id('vel'), sprintId: sp.id, teamId: s.teamId, completedPoints: Math.round(target * jitter), availableDays: 10 - (i % 2) });
  }
});

// ── Accelerators & applications ─────────────────────────────────────────────────
export const accelerators: Accelerator[] = [
  { id: 'acc_genai', name: 'GenAI Codegen Suite', type: 'genai', domainTags: ['banking', 'general'], techStack: ['TypeScript', 'Java'], effortSavedFactor: 0.25 },
  { id: 'acc_ledger', name: 'Ledger Framework', type: 'framework', domainTags: ['banking', 'fintech'], techStack: ['Java'], effortSavedFactor: 0.18 },
  { id: 'acc_testkit', name: 'Auto Test Harness', type: 'accelerator', domainTags: ['general'], techStack: ['TypeScript', 'Python'], effortSavedFactor: 0.12 },
];

export const assetApplications: AssetApplication[] = [
  { id: id('asset'), acceleratorId: 'acc_genai', featureId: 'feat_token', estEffortSaved: 300, actualEffortSaved: 280, marginUplift: money(15_000, 'USD') },
];

// ── Users (one per persona) ───────────────────────────────────────────────────
export const users: User[] = [
  { id: 'usr_cdo', name: 'Priya Menon', email: 'priya.menon@opus.com', roleKey: 'cdo', status: 'active' },
  { id: 'usr_fin', name: 'David Cole', email: 'david.cole@opus.com', roleKey: 'finance', status: 'active' },
  { id: 'usr_acc', name: 'Sara Khan', email: 'sara.khan@opus.com', roleKey: 'account', status: 'active' },
  { id: 'usr_del', name: 'Mark Reilly', email: 'mark.reilly@opus.com', roleKey: 'delivery', status: 'active' },
  { id: 'usr_bid', name: 'Lena Ortiz', email: 'lena.ortiz@opus.com', roleKey: 'bid', status: 'active' },
  { id: 'usr_hr', name: 'Anita Rao', email: 'anita.rao@opus.com', roleKey: 'hr', status: 'active' },
  { id: 'usr_admin', name: 'System Admin', email: 'admin@opus.com', roleKey: 'admin', status: 'active' },
];

// ── FX & appraisal ─────────────────────────────────────────────────────────────
export const fxRates: FxRate[] = [
  { from: 'INR', to: 'USD', rate: 1 / 83, effectiveFrom: '2026-01-01' },
  { from: 'GBP', to: 'USD', rate: 1.27, effectiveFrom: '2026-01-01' },
  { from: 'CAD', to: 'USD', rate: 1 / 1.36, effectiveFrom: '2026-01-01' },
];

export const appraisalCycles: AppraisalCycle[] = [
  { id: id('appr'), scope: 'India', hikePct: 0.07, cycleDate: '2026-07-01' },
  { id: id('appr'), scope: 'US', hikePct: 0.05, cycleDate: '2026-07-01' },
];

// ── Change requests (on tokenization) ───────────────────────────────────────────
export const changeRequests: ChangeRequest[] = [
  { id: 'cr_1', projectId: 'prj_token', featureId: 'feat_token', description: 'Add multi-asset token support', type: 'add', deltaStoryPoints: 40, deltaCost: money(10_000, 'USD'), deltaPrice: money(15_000, 'USD'), marginImpactPct: 0.05, revisedTimelineSprints: 1, status: 'submitted', raisedOn: '2026-06-01' },
  { id: 'cr_2', projectId: 'prj_token', featureId: 'feat_token_kyc', description: 'Simplify KYC to single step', type: 'descope', deltaStoryPoints: -20, deltaCost: money(-5_000, 'USD'), deltaPrice: money(-6_000, 'USD'), marginImpactPct: 0.01, revisedTimelineSprints: 0, status: 'draft', raisedOn: '2026-06-10' },
];

// ── Revenue recognition / WIP (last 4 months per project) ────────────────────────
export const revenueRecognition: RevenueRecognitionRecord[] = [];
const periods = ['2026-03', '2026-04', '2026-05', '2026-06'];
specs.forEach((s) => {
  periods.forEach((p, i) => {
    const billed = s.monthlyBilling;
    const isOutcome = s.model === 'outcome' || s.model === 'outcome-warranty';
    const recognized = isOutcome ? (i % 2 === 0 ? billed * 1.6 : 0) : billed; // lumpy on acceptance
    const wip = isOutcome && i % 2 === 1 ? billed * 0.8 : 0;
    revenueRecognition.push({
      id: id('rr'),
      projectId: s.projectId,
      period: p,
      policy: s.model === 'tnm' ? 'as-billed' : s.model === 'managed-capacity' ? 'ratable' : s.model === 'gain-share' ? 'floor-plus-bonus' : 'on-acceptance',
      recognized: money(recognized, 'USD'),
      billed: money(billed, 'USD'),
      wipUnbilled: money(wip, 'USD'),
      deferred: money(isOutcome && i % 2 === 0 ? billed * 0.6 : 0, 'USD'),
    });
  });
});

// ── Alerts ───────────────────────────────────────────────────────────────────
export const alerts: Alert[] = [
  { id: id('al'), type: 'margin-floor-approaching', severity: 'critical', title: 'Tokenization Platform margin approaching floor', driver: '7% appraisal on 2026-07-01 compresses margin to ~14%', sourceScreen: '/margin', sourceId: 'prj_token', requires: 'margin', status: 'new', raisedAt: '2026-06-18' },
  { id: id('al'), type: 'milestone-overdue', severity: 'warning', title: 'Quantia M2 acceptance overdue risk', driver: 'Milestone due 2026-07-31, no acceptance scheduled', sourceScreen: '/revenue', sourceId: 'prj_quantia', requires: 'margin', status: 'new', raisedAt: '2026-06-19' },
  { id: id('al'), type: 'revision-window', severity: 'info', title: 'Meridian SOW entering revision window', driver: 'Rate frozen since 2022-04; renewal in <90 days', sourceScreen: '/risk', sourceId: 'prj_token', requires: 'clientRate', status: 'new', raisedAt: '2026-06-20' },
  { id: id('al'), type: 'attrition-spike', severity: 'warning', title: 'Attrition risk elevated on Nordic team', driver: 'Two L4 engineers flagged high attrition risk', sourceScreen: '/risk', sourceId: 'prj_nordic', requires: 'attrition', status: 'acknowledged', raisedAt: '2026-06-15' },
  { id: id('al'), type: 'capacity-shortfall', severity: 'info', title: 'Helios capacity shortfall next PI', driver: 'Predicted velocity below committed scope by ~12 SP', sourceScreen: '/capacity', sourceId: 'prj_helios', status: 'new', raisedAt: '2026-06-17' },
];

// ── Deals ────────────────────────────────────────────────────────────────────
export const deals: Deal[] = [
  { id: id('deal'), clientId: 'cli_meridian', name: 'Tokenization — Outcome conversion', modelType: 'outcome', price: money(90_000, 'GBP'), marginPct: 0.33, stage: 'negotiation', ownerId: 'usr_bid', scenarioId: undefined, winProbability: 62, createdAt: '2026-05-20' },
  { id: id('deal'), clientId: 'cli_atlas', name: 'Atlas — Managed capacity pod', modelType: 'managed-capacity', price: money(220_000, 'USD'), marginPct: 0.24, stage: 'submitted', ownerId: 'usr_bid', winProbability: 48, createdAt: '2026-06-01' },
  { id: id('deal'), clientId: 'cli_helios', name: 'Helios — Gain-share extension', modelType: 'gain-share', price: money(110_000, 'USD'), marginPct: 0.27, stage: 'won', ownerId: 'usr_acc', winProbability: 100, winLossReason: 'Strong velocity track record', createdAt: '2026-03-10', closedAt: '2026-04-02' },
  { id: id('deal'), clientId: 'cli_nordic', name: 'Nordic — Outcome pilot', modelType: 'outcome', price: money(140_000, 'USD'), marginPct: 0.3, stage: 'lost', ownerId: 'usr_bid', winProbability: 0, winLossReason: 'Client preferred incumbent', createdAt: '2026-02-15', closedAt: '2026-03-20' },
  { id: id('deal'), clientId: 'cli_quantia', name: 'Quantia — Warranty tail', modelType: 'outcome-warranty', price: money(75_000, 'CAD'), marginPct: 0.35, stage: 'draft', ownerId: 'usr_bid', winProbability: 40, createdAt: '2026-06-12' },
];

// ── Utilization (current month) ─────────────────────────────────────────────────
export const utilizationRecords: UtilizationRecord[] = employees.map((e) => {
  const available = 160;
  const billable = e.status === 'on-bench' ? 20 : Math.round(available * (0.7 + ((nameIdx + e.name.length) % 4) * 0.08));
  return { id: id('util'), employeeId: e.id, period: '2026-06', billableHours: Math.min(billable, 180), availableHours: available, utilizationPct: Math.min(billable, 180) / available };
});

// ── Approvals (pending) ──────────────────────────────────────────────────────
export const approvals: Approval[] = [
  { id: 'apr_1', actionType: 'change-request', actionRef: 'cr_1', summary: 'CR: Add multi-asset token support (+40 SP, +$15k)', requestedBy: 'Lena Ortiz', approverRole: 'cdo', status: 'pending', requestedAt: '2026-06-01' },
  { id: 'apr_2', actionType: 'rate-revision', actionRef: 'cli_meridian', summary: 'Future-dated rate revision: Sr. Engineer India 5-10 → ₹52/hr', requestedBy: 'Sara Khan', approverRole: 'finance', status: 'pending', requestedAt: '2026-06-05' },
];

// ── Audit ──────────────────────────────────────────────────────────────────────
export const auditEvents: AuditEvent[] = [
  { id: id('aud'), userId: 'usr_acc', userName: 'Sara Khan', entity: 'BillRate', entityId: 'cli_meridian', action: 'create', detail: 'Added future-dated rate revision', at: '2026-06-05T10:12:00Z' },
  { id: id('aud'), userId: 'usr_bid', userName: 'Lena Ortiz', entity: 'ChangeRequest', entityId: 'cr_1', action: 'submit', detail: 'Submitted CR for approval', at: '2026-06-01T09:30:00Z' },
];

export const scenarios: Scenario[] = [];

export interface SeedData {
  clients: Client[];
  teams: Team[];
  scenarios: Scenario[];
  employees: Employee[];
  sows: SOW[];
  projects: Project[];
  allocations: Allocation[];
  billRates: BillRate[];
  calendars: Calendar[];
  leaveRecords: LeaveRecord[];
  features: Feature[];
  milestones: Milestone[];
  sprints: Sprint[];
  velocityRecords: VelocityRecord[];
  accelerators: Accelerator[];
  assetApplications: AssetApplication[];
  users: User[];
  fxRates: FxRate[];
  appraisalCycles: AppraisalCycle[];
  changeRequests: ChangeRequest[];
  revenueRecognition: RevenueRecognitionRecord[];
  alerts: Alert[];
  deals: Deal[];
  utilizationRecords: UtilizationRecord[];
  approvals: Approval[];
  auditEvents: AuditEvent[];
}

export function buildSeed(): SeedData {
  return {
    clients, teams, scenarios, employees, sows, projects, allocations, billRates, calendars, leaveRecords,
    features, milestones, sprints, velocityRecords, accelerators, assetApplications, users, fxRates,
    appraisalCycles, changeRequests, revenueRecognition, alerts, deals, utilizationRecords, approvals, auditEvents,
  };
}
