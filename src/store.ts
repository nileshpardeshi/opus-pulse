import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Alert,
  AppConfig,
  Approval,
  ApprovalStatus,
  BillRate,
  ChangeRequest,
  CurrencyCode,
  Deal,
  DealStage,
  Employee,
  Milestone,
  Project,
  RiskClassification,
  RoleKey,
  Scenario,
} from './types';
import { buildSeed, type SeedData } from './mock/seed';
import { ROLES } from './rbac/roles';
import { uid } from './utils';

const DEFAULT_CONFIG: AppConfig = {
  baseCurrency: 'USD',
  fxPolicy: 'period-rate',
  defaultHolidays: 10,
  defaultLeaves: 21,
  minMarginPct: 0.18,
  marginFloorPct: 0.15,
  focusFactor: 0.75,
  approvalThresholds: { priceBelowTargetPct: 0.05, crValueUsd: 10_000, discountPct: 0.1 },
};

interface RiskOverrideMap {
  [projectId: string]: { classification: RiskClassification; reason: string; user: string; at: string };
}

export interface AppState extends SeedData {
  currentRole: RoleKey;
  config: AppConfig;
  riskOverrides: RiskOverrideMap;

  // role + config
  setRole: (r: RoleKey) => void;
  setBaseCurrency: (c: CurrencyCode) => void;
  updateConfig: (patch: Partial<AppConfig>) => void;

  // master data (Module A / Admin)
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  addBillRate: (rate: BillRate) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  updateAllocation: (id: string, patch: Partial<{ allocationPct: number; billable: boolean }>) => void;

  // risk overrides (Module D)
  overrideRisk: (projectId: string, classification: RiskClassification, reason: string) => void;

  // scenarios (Module G)
  saveScenario: (s: Scenario) => void;
  deleteScenario: (id: string) => void;

  // change requests (Module K)
  addChangeRequest: (cr: ChangeRequest) => void;
  updateChangeRequest: (id: string, patch: Partial<ChangeRequest>) => void;

  // revenue (Module L)
  acceptMilestone: (id: string) => void;

  // alerts (Module M)
  setAlertStatus: (id: string, status: Alert['status']) => void;

  // deals (Module N)
  addDeal: (d: Deal) => void;
  setDealStage: (id: string, stage: DealStage, reason?: string) => void;

  // approvals (Module P)
  decideApproval: (id: string, status: ApprovalStatus, reason: string) => void;

  // audit
  logAudit: (entity: string, entityId: string, action: string, detail: string) => void;

  resetDemo: () => void;
}

function currentUserName(role: RoleKey): string {
  return ROLES[role].name;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      currentRole: 'cdo',
      config: DEFAULT_CONFIG,
      riskOverrides: {},

      setRole: (r) => set({ currentRole: r }),
      setBaseCurrency: (c) => set((s) => ({ config: { ...s.config, baseCurrency: c } })),
      updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

      updateEmployee: (id, patch) =>
        set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

      addBillRate: (rate) =>
        set((s) => ({ billRates: [...s.billRates, rate] })),

      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      updateAllocation: (id, patch) =>
        set((s) => ({ allocations: s.allocations.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      overrideRisk: (projectId, classification, reason) =>
        set((s) => {
          const user = currentUserName(s.currentRole);
          const at = new Date().toISOString();
          return {
            riskOverrides: { ...s.riskOverrides, [projectId]: { classification, reason, user, at } },
            auditEvents: [
              { id: uid('aud'), userId: s.currentRole, userName: user, entity: 'RiskSignal', entityId: projectId, action: 'override', detail: `→ ${classification}: ${reason}`, at },
              ...s.auditEvents,
            ],
          };
        }),

      saveScenario: (sc) => set((s) => ({ scenarios: [...s.scenarios.filter((x) => x.id !== sc.id), sc] })),
      deleteScenario: (id) => set((s) => ({ scenarios: s.scenarios.filter((x) => x.id !== id) })),

      addChangeRequest: (cr) =>
        set((s) => ({
          changeRequests: [cr, ...s.changeRequests],
          auditEvents: [{ id: uid('aud'), userId: s.currentRole, userName: currentUserName(s.currentRole), entity: 'ChangeRequest', entityId: cr.id, action: 'create', detail: cr.description, at: new Date().toISOString() }, ...s.auditEvents],
        })),
      updateChangeRequest: (id, patch) =>
        set((s) => ({ changeRequests: s.changeRequests.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      acceptMilestone: (id) =>
        set((s) => ({
          milestones: s.milestones.map((m: Milestone) => (m.id === id ? { ...m, acceptanceStatus: 'accepted', acceptedDate: new Date().toISOString().slice(0, 10) } : m)),
          auditEvents: [{ id: uid('aud'), userId: s.currentRole, userName: currentUserName(s.currentRole), entity: 'Milestone', entityId: id, action: 'accept', detail: 'Milestone accepted → revenue recognized', at: new Date().toISOString() }, ...s.auditEvents],
        })),

      setAlertStatus: (id, status) =>
        set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, status } : a)) })),

      addDeal: (d) => set((s) => ({ deals: [d, ...s.deals] })),
      setDealStage: (id, stage, reason) =>
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === id
              ? { ...d, stage, winLossReason: reason ?? d.winLossReason, closedAt: ['won', 'lost', 'withdrawn'].includes(stage) ? new Date().toISOString().slice(0, 10) : d.closedAt, winProbability: stage === 'won' ? 100 : stage === 'lost' ? 0 : d.winProbability }
              : d,
          ),
        })),

      decideApproval: (id, status, reason) =>
        set((s) => {
          const at = new Date().toISOString();
          const appr = s.approvals.find((a) => a.id === id);
          const updates: Partial<AppState> = {
            approvals: s.approvals.map((a) => (a.id === id ? { ...a, status, reason, decidedAt: at } : a)),
            auditEvents: [{ id: uid('aud'), userId: s.currentRole, userName: currentUserName(s.currentRole), entity: 'Approval', entityId: id, action: status, detail: reason, at }, ...s.auditEvents],
          };
          // propagate to a linked change request
          if (appr?.actionType === 'change-request') {
            updates.changeRequests = s.changeRequests.map((c) =>
              c.id === appr.actionRef ? { ...c, status: status === 'approved' ? 'approved' : 'rejected' } : c,
            );
          }
          return updates as AppState;
        }),

      logAudit: (entity, entityId, action, detail) =>
        set((s) => ({
          auditEvents: [{ id: uid('aud'), userId: s.currentRole, userName: currentUserName(s.currentRole), entity, entityId, action, detail, at: new Date().toISOString() }, ...s.auditEvents],
        })),

      resetDemo: () => set({ ...buildSeed(), riskOverrides: {}, config: DEFAULT_CONFIG }),
    }),
    {
      name: 'opus-pulse-store',
      version: 1,
    },
  ),
);

// ── Convenience selectors (used across screens) ───────────────────────────────
export const useRole = () => useStore((s) => ROLES[s.currentRole]);
export const useCan = (cap: keyof (typeof ROLES)['cdo']['can']) => useStore((s) => ROLES[s.currentRole].can[cap]);
