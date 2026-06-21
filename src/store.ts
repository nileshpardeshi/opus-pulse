import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BillingConfig,
  Client,
  ExpenseLine,
  OutcomeConfig,
  Project,
  ResourceLine,
  RoleRate,
  SOW,
} from './types';
import { buildSeed, type SeedData } from './mock/seed';
import { uid } from './utils';

export interface AppState extends SeedData {
  // ── Accounts / rate cards ──
  addClient: (c: Client) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addRoleRate: (clientId: string, rate: RoleRate) => void;
  updateRoleRate: (clientId: string, rateId: string, patch: Partial<RoleRate>) => void;
  deleteRoleRate: (clientId: string, rateId: string) => void;

  // ── SOWs ──
  addSow: (s: SOW) => void;
  updateSow: (id: string, patch: Partial<SOW>) => void;
  deleteSow: (id: string) => void;

  // ── Projects ──
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // ── Billing config ──
  getBilling: (projectId: string) => BillingConfig;
  setBilling: (projectId: string, patch: Partial<BillingConfig>) => void;
  addResource: (projectId: string, r: ResourceLine) => void;
  updateResource: (projectId: string, rid: string, patch: Partial<ResourceLine>) => void;
  deleteResource: (projectId: string, rid: string) => void;
  addExpense: (projectId: string, e: ExpenseLine) => void;
  updateExpense: (projectId: string, eid: string, patch: Partial<ExpenseLine>) => void;
  deleteExpense: (projectId: string, eid: string) => void;

  // ── Outcome config ──
  getOutcome: (projectId: string) => OutcomeConfig;
  setOutcome: (projectId: string, patch: Partial<OutcomeConfig>) => void;

  resetDemo: () => void;
}

function defaultBilling(projectId: string, hoursPerDay = 8): BillingConfig {
  return { projectId, resources: [], hoursPerDay, annualLeaves: 18, nationalHolidays: 12, expenses: [] };
}
function defaultOutcome(projectId: string): OutcomeConfig {
  return { projectId, hoursPerStoryPoint: 12.8, sprintsPerMonth: 2, reservePct: 0.15, caseACapacity: 7, caseBCapacity: 8, efficiencyGainPct: 0.1, clientDiscountPct: 0.05, minInvoiceSp: 120, mix: { fresherVelocityPct: 0.65, fresherReworkPct: 0.1, swaps: {} } };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),

      addClient: (c) => set((s) => ({ clients: [...s.clients, c] })),
      updateClient: (cid, patch) => set((s) => ({ clients: s.clients.map((c) => (c.id === cid ? { ...c, ...patch } : c)) })),
      deleteClient: (cid) => set((s) => ({ clients: s.clients.filter((c) => c.id !== cid), projects: s.projects.filter((p) => p.clientId !== cid), sows: s.sows.filter((w) => w.clientId !== cid) })),

      addRoleRate: (cid, rate) => set((s) => ({ clients: s.clients.map((c) => (c.id === cid ? { ...c, roleRates: [...c.roleRates, rate] } : c)) })),
      updateRoleRate: (cid, rid, patch) => set((s) => ({ clients: s.clients.map((c) => (c.id === cid ? { ...c, roleRates: c.roleRates.map((r) => (r.id === rid ? { ...r, ...patch } : r)) } : c)) })),
      deleteRoleRate: (cid, rid) => set((s) => ({ clients: s.clients.map((c) => (c.id === cid ? { ...c, roleRates: c.roleRates.filter((r) => r.id !== rid) } : c)) })),

      addSow: (w) => set((s) => ({ sows: [...s.sows, w] })),
      updateSow: (wid, patch) => set((s) => ({ sows: s.sows.map((w) => (w.id === wid ? { ...w, ...patch } : w)) })),
      deleteSow: (wid) => set((s) => ({ sows: s.sows.filter((w) => w.id !== wid) })),

      addProject: (p) => set((s) => ({ projects: [...s.projects, p] })),
      updateProject: (pid, patch) => set((s) => ({ projects: s.projects.map((p) => (p.id === pid ? { ...p, ...patch } : p)) })),
      deleteProject: (pid) => set((s) => ({ projects: s.projects.filter((p) => p.id !== pid) })),

      getBilling: (pid) => {
        const existing = get().billingConfigs[pid];
        if (existing) return existing;
        const proj = get().projects.find((p) => p.id === pid);
        const b = defaultBilling(pid, proj?.hoursPerDay ?? 8);
        set((s) => ({ billingConfigs: { ...s.billingConfigs, [pid]: b } }));
        return b;
      },
      setBilling: (pid, patch) => set((s) => ({ billingConfigs: { ...s.billingConfigs, [pid]: { ...(s.billingConfigs[pid] ?? defaultBilling(pid)), ...patch } } })),
      addResource: (pid, r) => set((s) => { const b = s.billingConfigs[pid] ?? defaultBilling(pid); return { billingConfigs: { ...s.billingConfigs, [pid]: { ...b, resources: [...b.resources, r] } } }; }),
      updateResource: (pid, rid, patch) => set((s) => { const b = s.billingConfigs[pid]; if (!b) return {}; return { billingConfigs: { ...s.billingConfigs, [pid]: { ...b, resources: b.resources.map((r) => (r.id === rid ? { ...r, ...patch } : r)) } } }; }),
      deleteResource: (pid, rid) => set((s) => { const b = s.billingConfigs[pid]; if (!b) return {}; return { billingConfigs: { ...s.billingConfigs, [pid]: { ...b, resources: b.resources.filter((r) => r.id !== rid) } } }; }),
      addExpense: (pid, e) => set((s) => { const b = s.billingConfigs[pid] ?? defaultBilling(pid); return { billingConfigs: { ...s.billingConfigs, [pid]: { ...b, expenses: [...b.expenses, e] } } }; }),
      updateExpense: (pid, eid, patch) => set((s) => { const b = s.billingConfigs[pid]; if (!b) return {}; return { billingConfigs: { ...s.billingConfigs, [pid]: { ...b, expenses: b.expenses.map((e) => (e.id === eid ? { ...e, ...patch } : e)) } } }; }),
      deleteExpense: (pid, eid) => set((s) => { const b = s.billingConfigs[pid]; if (!b) return {}; return { billingConfigs: { ...s.billingConfigs, [pid]: { ...b, expenses: b.expenses.filter((e) => e.id !== eid) } } }; }),

      getOutcome: (pid) => {
        const existing = get().outcomeConfigs[pid];
        if (existing) return existing;
        const o = defaultOutcome(pid);
        set((s) => ({ outcomeConfigs: { ...s.outcomeConfigs, [pid]: o } }));
        return o;
      },
      setOutcome: (pid, patch) => set((s) => ({ outcomeConfigs: { ...s.outcomeConfigs, [pid]: { ...(s.outcomeConfigs[pid] ?? defaultOutcome(pid)), ...patch } } })),

      resetDemo: () => set({ ...buildSeed() }),
    }),
    { name: 'opus-pulse-conv-v4', version: 4 },
  ),
);

export { uid };
