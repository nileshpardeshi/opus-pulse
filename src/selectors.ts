import { useMemo } from 'react';
import { useStore } from './store';
import { scoreProject } from './ai';
import { projectEconomics, type ProjectEconomics } from './engines/margin';
import type { Employee, Project, RiskSignal } from './types';

export function useRiskSignals(): RiskSignal[] {
  const { projects, sows, allocations, employees, riskOverrides } = useStore();
  return useMemo(() => {
    return projects.map((p) => {
      const sow = sows.find((s) => s.id === p.sowId)!;
      const sig = scoreProject(p, sow, allocations, employees);
      const ov = riskOverrides[p.id];
      if (ov) return { ...sig, classification: ov.classification, override: ov };
      return sig;
    });
  }, [projects, sows, allocations, employees, riskOverrides]);
}

export function usePortfolioEconomics(): { byProject: Record<string, ProjectEconomics>; totalRevenue: number; totalCost: number; marginPct: number } {
  const { projects, allocations, employees } = useStore();
  return useMemo(() => {
    const byProject: Record<string, ProjectEconomics> = {};
    let totalRevenue = 0;
    let totalCost = 0;
    projects.forEach((p) => {
      const e = projectEconomics(p, allocations, employees);
      byProject[p.id] = e;
      totalRevenue += e.revenueMonthlyUsd;
      totalCost += e.costMonthlyUsd;
    });
    return { byProject, totalRevenue, totalCost, marginPct: totalRevenue > 0 ? (totalRevenue - totalCost) / totalRevenue : 0 };
  }, [projects, allocations, employees]);
}

export function useTeamEmployees(teamId: string): Employee[] {
  const employees = useStore((s) => s.employees);
  return useMemo(() => employees.filter((e) => e.teamId === teamId), [employees, teamId]);
}

export function clientName(clients: { id: string; name: string }[], id: string): string {
  return clients.find((c) => c.id === id)?.name ?? id;
}

export function projectByTeam(projects: Project[], teamId: string): Project | undefined {
  return projects.find((p) => p.teamId === teamId);
}
