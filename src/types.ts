// ─────────────────────────────────────────────────────────────────────────────
// Opus Pulse — domain model (mirrors BRD v1.2 §12 ERD)
// Single source of truth for all entity shapes used by engines, stores and screens.
// ─────────────────────────────────────────────────────────────────────────────

export type CurrencyCode = 'USD' | 'INR' | 'GBP' | 'CAD';
export type Country = 'India' | 'US' | 'UK' | 'Canada';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export type DeliveryModel =
  | 'tnm'
  | 'managed-capacity'
  | 'gain-share'
  | 'outcome'
  | 'outcome-warranty';

export const DELIVERY_MODEL_LABEL: Record<DeliveryModel, string> = {
  tnm: 'TNM',
  'managed-capacity': 'Managed capacity',
  'gain-share': 'TNM + gain-share',
  outcome: 'Outcome / milestone',
  'outcome-warranty': 'Outcome + warranty',
};

// ── RBAC ──────────────────────────────────────────────────────────────────────
export type RoleKey =
  | 'cdo'
  | 'finance'
  | 'account'
  | 'delivery'
  | 'bid'
  | 'hr'
  | 'admin';

export interface Role {
  key: RoleKey;
  name: string;
  description: string;
  /** capability flags that gate sensitive data and actions */
  can: {
    salary: boolean;
    margin: boolean;
    clientRate: boolean;
    marketplace: boolean;
    attrition: boolean;
    approve: boolean;
    admin: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleKey: RoleKey;
  status: 'active' | 'inactive';
}

// ── Workforce & cost ────────────────────────────────────────────────────────
export type CostComponent =
  | 'base_salary'
  | 'variable_pay'
  | 'employer_statutory'
  | 'insurance'
  | 'infrastructure'
  | 'hardware'
  | 'software_licenses'
  | 'training'
  | 'travel'
  | 'allocated_overhead'
  | 'bench_allocation';

export const COST_COMPONENT_LABEL: Record<CostComponent, string> = {
  base_salary: 'Base salary',
  variable_pay: 'Variable pay / bonus',
  employer_statutory: 'Employer statutory (PF / SS)',
  insurance: 'Insurance',
  infrastructure: 'Infrastructure (seat / office)',
  hardware: 'Hardware (laptop)',
  software_licenses: 'Software licenses',
  training: 'Training',
  travel: 'Travel',
  allocated_overhead: 'Allocated overhead',
  bench_allocation: 'Bench allocation',
};

export interface CostLineItem {
  component: CostComponent;
  /** annual value in the employee's currency */
  value: number;
}

export type TenureBand = '0-2' | '2-5' | '5-10' | '10+';

export interface Employee {
  id: string;
  name: string;
  role: string;
  level: string;
  country: Country;
  currency: CurrencyCode;
  baseSalary: number;
  joinDate: string; // ISO
  status: 'active' | 'on-bench' | 'left';
  tenureBand: TenureBand;
  /** itemised annual cost components (most-specific-wins resolved into here) */
  costLineItems: CostLineItem[];
  teamId: string;
}

export interface BillRate {
  id: string;
  clientId: string;
  role: string;
  location: Country;
  tenureBand: TenureBand;
  rate: number; // per hour in currency
  currency: CurrencyCode;
  effectiveFrom: string;
  effectiveTo: string | null;
}

// ── Clients, SOWs, projects ──────────────────────────────────────────────────
export interface Client {
  id: string;
  name: string;
  region: string;
  industry: string;
  tier: 'strategic' | 'growth' | 'standard';
}

export interface SOW {
  id: string;
  clientId: string;
  modelType: DeliveryModel;
  hoursPerDay: 8 | 9;
  fxPolicy: 'period-rate' | 'spot';
  marginFloorPct: number; // e.g. 0.15
  minMarginPct: number; // target floor for pricing
  priceCurrency: CurrencyCode;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  sowId: string;
  clientId: string;
  name: string;
  monthlyBilling: Money; // illustrative monthly run-rate
  status: 'active' | 'at-risk' | 'closed';
  teamId: string;
  appraisalHikePct: number; // applied annually
}

export interface Allocation {
  id: string;
  projectId: string;
  employeeId: string;
  allocationPct: number; // 0..1
  billable: boolean;
  startDate: string;
  endDate: string | null;
}

// ── Calendars & leave ─────────────────────────────────────────────────────────
export interface Holiday {
  date: string;
  name: string;
}

export interface Calendar {
  country: Country;
  weekendDays: number[]; // 0=Sun..6=Sat
  holidays: Holiday[];
  defaultAnnualLeaves: number;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  days: number;
  year: number;
}

// ── Delivery: features, milestones, sprints, velocity ────────────────────────
export interface Feature {
  id: string;
  projectId: string;
  name: string;
  sizeStoryPoints: number;
  riskBufferPct: number;
}

export type AcceptanceStatus = 'pending' | 'in-progress' | 'delivered' | 'accepted';

export interface Milestone {
  id: string;
  featureId: string;
  name: string;
  storyPoints: number;
  price: Money;
  acceptanceStatus: AcceptanceStatus;
  dueDate: string;
  acceptedDate?: string;
}

export interface Sprint {
  id: string;
  projectId: string;
  index: number;
  startDate: string;
  endDate: string;
}

export interface VelocityRecord {
  id: string;
  sprintId: string;
  teamId: string;
  completedPoints: number;
  availableDays: number;
}

export interface Team {
  id: string;
  name: string;
  projectId: string;
  /** team-specific configurable SP→hours conversion (FR-I2) */
  spToHours: number;
}

// ── Scenarios (comparison workbench) ──────────────────────────────────────────
export interface ScenarioAssumptions {
  featureId: string;
  resourceCount: number;
  offshoreSharePct: number;
  automationGainPct: number;
  targetMarginPct: number;
  model: DeliveryModel;
}

export interface Scenario {
  id: string;
  projectId: string;
  name: string;
  assumptions: ScenarioAssumptions;
  result: Record<string, number>;
  createdAt: string;
}

// ── Delivery marketplace ──────────────────────────────────────────────────────
export interface Accelerator {
  id: string;
  name: string;
  type: 'component' | 'accelerator' | 'framework' | 'genai';
  domainTags: string[];
  techStack: string[];
  effortSavedFactor: number; // 0..1 of effort
}

export interface AssetApplication {
  id: string;
  acceleratorId: string;
  featureId: string;
  estEffortSaved: number; // hours
  actualEffortSaved: number; // hours
  marginUplift: Money;
}

// ── Risk signals (AI) ─────────────────────────────────────────────────────────
export type RiskClassification = 'Revise' | 'Convert' | 'Exit';

export interface RiskDriver {
  label: string;
  weight: number; // contribution 0..1
}

export interface RiskSignal {
  id: string;
  projectId: string;
  floorBreachProbability: number; // 0..1
  conversionScore: number; // 0..100
  revisionProbability: number; // 0..100
  attritionRisk: number; // 0..100
  backfillCostDelta: Money;
  classification: RiskClassification;
  drivers: RiskDriver[];
  recommendedAction: string;
  monthsToFloor: number | null;
  override?: RiskOverride;
}

export interface RiskOverride {
  classification: RiskClassification;
  reason: string;
  user: string;
  at: string;
}

// ── FX & appraisal ─────────────────────────────────────────────────────────────
export interface FxRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  effectiveFrom: string;
}

export interface AppraisalCycle {
  id: string;
  scope: string;
  hikePct: number;
  cycleDate: string;
}

// ── Audit ──────────────────────────────────────────────────────────────────────
export interface AuditEvent {
  id: string;
  userId: string;
  userName: string;
  entity: string;
  entityId: string;
  action: string;
  detail: string;
  at: string;
}

// ── Module K — Change requests ─────────────────────────────────────────────────
export type CRType = 'add' | 'modify' | 'descope';
export type CRStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'client-accepted';

export interface ChangeRequest {
  id: string;
  projectId: string;
  featureId: string;
  description: string;
  type: CRType;
  deltaStoryPoints: number;
  deltaCost: Money;
  deltaPrice: Money;
  marginImpactPct: number;
  revisedTimelineSprints: number;
  status: CRStatus;
  raisedOn: string;
  approvalId?: string;
}

// ── Module L — Revenue recognition & WIP ────────────────────────────────────────
export type RevRecPolicy =
  | 'as-billed'
  | 'ratable'
  | 'on-acceptance'
  | 'percent-completion'
  | 'floor-plus-bonus';

export interface RevenueRecognitionRecord {
  id: string;
  projectId: string;
  period: string; // YYYY-MM
  policy: RevRecPolicy;
  recognized: Money;
  billed: Money;
  wipUnbilled: Money;
  deferred: Money;
}

// ── Module M — Alerts ───────────────────────────────────────────────────────────
export type AlertType =
  | 'margin-floor-breach'
  | 'margin-floor-approaching'
  | 'risk-class-change'
  | 'attrition-spike'
  | 'revision-window'
  | 'milestone-overdue'
  | 'scope-change-exceeded'
  | 'capacity-shortfall'
  | 'data-stale';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved' | 'snoozed';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  driver: string;
  sourceScreen: string;
  sourceId: string;
  /** capability required to view (RBAC) */
  requires?: keyof Role['can'];
  status: AlertStatus;
  raisedAt: string;
}

// ── Module N — Deals ────────────────────────────────────────────────────────────
export type DealStage =
  | 'draft'
  | 'submitted'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'withdrawn';

export interface Deal {
  id: string;
  clientId: string;
  name: string;
  modelType: DeliveryModel;
  price: Money;
  marginPct: number;
  stage: DealStage;
  ownerId: string;
  scenarioId?: string;
  winProbability: number; // 0..100
  winLossReason?: string;
  createdAt: string;
  closedAt?: string;
}

// ── Module O — Utilization ──────────────────────────────────────────────────────
export interface UtilizationRecord {
  id: string;
  employeeId: string;
  period: string; // YYYY-MM
  billableHours: number;
  availableHours: number;
  utilizationPct: number; // 0..1
}

// ── Module P — Approvals ────────────────────────────────────────────────────────
export type ApprovalActionType =
  | 'price-below-target'
  | 'rate-revision'
  | 'ai-override'
  | 'change-request'
  | 'discount';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  actionType: ApprovalActionType;
  actionRef: string;
  summary: string;
  requestedBy: string;
  approverRole: RoleKey;
  status: ApprovalStatus;
  reason?: string;
  requestedAt: string;
  decidedAt?: string;
}

// ── Config ──────────────────────────────────────────────────────────────────────
export interface AppConfig {
  baseCurrency: CurrencyCode;
  fxPolicy: 'period-rate' | 'spot';
  defaultHolidays: number;
  defaultLeaves: number;
  minMarginPct: number;
  marginFloorPct: number;
  focusFactor: number;
  approvalThresholds: {
    priceBelowTargetPct: number; // approval needed if margin within this of floor
    crValueUsd: number;
    discountPct: number;
  };
}
