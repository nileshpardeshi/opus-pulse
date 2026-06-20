import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import pptxgen from 'pptxgenjs';
import type { AppState } from './store';
import { projectEconomics } from './engines/margin';
import { computePricing } from './engines/outcomePricing';
import { spEconomics } from './engines/spEconomics';
import { utilizationSummary } from './engines/utilization';
import { ROLES } from './rbac/roles';
import { convert, fmtMoney, fmtPct } from './utils';
import { DELIVERY_MODEL_LABEL } from './types';

function saveXlsx(rows: Record<string, unknown>[], sheet: string, file: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, file);
}

function header(doc: jsPDF, title: string, sub: string) {
  doc.setFontSize(18); doc.setTextColor('#1f6feb'); doc.text('Opus Pulse', 14, 18);
  doc.setFontSize(13); doc.setTextColor('#0d1117'); doc.text(title, 14, 28);
  doc.setFontSize(9); doc.setTextColor('#6e7781'); doc.text(sub, 14, 34);
}

// ── Client proposal pack (PDF) — NO cost/margin/marketplace (FR-J5/AC-H2) ──────
export function clientProposalPdf(s: AppState) {
  const project = s.projects.find((p) => p.id === 'prj_token') ?? s.projects[0];
  const feature = s.features.find((f) => f.projectId === project.id)!;
  const ms = s.milestones.filter((m) => m.featureId === feature.id);
  const doc = new jsPDF();
  header(doc, 'Client proposal pack — outcome delivery', `${project.name} · prepared ${new Date().toISOString().slice(0, 10)}`);
  autoTable(doc, { startY: 42, head: [['Scope', 'Story points', 'Timeline']], body: [[feature.name, String(feature.sizeStoryPoints), `${Math.ceil(feature.sizeStoryPoints / 80)} sprints`]] });
  autoTable(doc, { head: [['Milestone', 'Story points', 'Price']], body: ms.map((m) => [m.name, String(m.storyPoints), fmtMoney(m.price.amount, m.price.currency)]) });
  doc.setFontSize(8); doc.setTextColor('#6e7781'); doc.text('Client-facing pack — contains no internal cost, margin, or marketplace data (FR-J5).', 14, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8);
  doc.save('opus-pulse-client-proposal.pdf');
}

export function clientProposalPptx(s: AppState) {
  const project = s.projects.find((p) => p.id === 'prj_token') ?? s.projects[0];
  const feature = s.features.find((f) => f.projectId === project.id)!;
  const ms = s.milestones.filter((m) => m.featureId === feature.id);
  const pptx = new pptxgen();
  const t = pptx.addSlide();
  t.addText('Opus Pulse — Outcome Delivery Proposal', { x: 0.5, y: 0.5, fontSize: 26, bold: true, color: '1f6feb' });
  t.addText(project.name, { x: 0.5, y: 1.4, fontSize: 18, color: '0d1117' });
  const s2 = pptx.addSlide();
  s2.addText('Milestones & price', { x: 0.5, y: 0.4, fontSize: 20, bold: true });
  const cell = (t: string) => ({ text: t });
  s2.addTable([['Milestone', 'SP', 'Price'].map(cell), ...ms.map((m) => [m.name, String(m.storyPoints), fmtMoney(m.price.amount, m.price.currency)].map(cell))], { x: 0.5, y: 1.2, w: 8.5, fontSize: 12, border: { type: 'solid', color: 'DDDDDD' } });
  s2.addText('No internal cost/margin/marketplace data (FR-J5).', { x: 0.5, y: 5, fontSize: 9, color: '6e7781' });
  pptx.writeFile({ fileName: 'opus-pulse-client-proposal.pptx' });
}

// ── Internal margin pack (PDF) ─────────────────────────────────────────────────
export function marginPackPdf(s: AppState) {
  const cur = s.config.baseCurrency;
  const doc = new jsPDF();
  header(doc, 'Internal margin pack', `Base currency ${cur} · ${new Date().toISOString().slice(0, 10)}`);
  const body = s.projects.map((p) => {
    const e = projectEconomics(p, s.allocations, s.employees);
    return [p.name, fmtMoney(e.revenueMonthlyUsd, cur, { compact: true }), fmtMoney(e.costMonthlyUsd, cur, { compact: true }), fmtPct(e.marginPct)];
  });
  autoTable(doc, { startY: 42, head: [['Project', 'Revenue/mo', 'Loaded cost/mo', 'Margin %']], body });
  doc.save('opus-pulse-margin-pack.pdf');
}

export function marginPackExcel(s: AppState) {
  const cur = s.config.baseCurrency;
  const rows = s.projects.map((p) => {
    const e = projectEconomics(p, s.allocations, s.employees);
    return { Project: p.name, RevenueMonthly: Math.round(e.revenueMonthlyUsd), LoadedCostMonthly: Math.round(e.costMonthlyUsd), MarginPct: Math.round(e.marginPct * 100), Headcount: e.headcount, Currency: cur };
  });
  saveXlsx(rows, 'Margin', 'opus-pulse-margin-pack.xlsx');
}

// ── Forecast (Excel) ─────────────────────────────────────────────────────────
export function forecastExcel(s: AppState) {
  const cur = s.config.baseCurrency;
  const rows = s.projects.map((p) => {
    const e = projectEconomics(p, s.allocations, s.employees);
    return { Project: p.name, AnnualBilling: Math.round(e.revenueMonthlyUsd * 12), ActualToDate: Math.round(e.revenueMonthlyUsd * 12 * 0.47), ProjectedRemaining: Math.round(e.revenueMonthlyUsd * 12 * 0.53), Currency: cur };
  });
  saveXlsx(rows, 'Forecast', 'opus-pulse-forecast.xlsx');
}

// ── SP economics (Excel) ────────────────────────────────────────────────────
export function spEconomicsExcel(s: AppState) {
  const rows = s.features.map((f) => {
    const project = s.projects.find((p) => p.id === f.projectId)!;
    const team = s.teams.find((t) => t.id === project.teamId)!;
    const econ = projectEconomics(project, s.allocations, s.employees);
    const teamSize = s.employees.filter((e) => e.teamId === team.id && e.status === 'active').length || 1;
    const blended = econ.costMonthlyUsd / (teamSize * 160);
    const ms = s.milestones.filter((m) => m.featureId === f.id);
    const price = ms.length ? ms.reduce((a, m) => a + convert(m.price.amount, m.price.currency, s.config.baseCurrency), 0) : (f.sizeStoryPoints * team.spToHours * blended) / 0.67;
    const e = spEconomics(price, f.sizeStoryPoints * team.spToHours * blended, f.sizeStoryPoints);
    return { Feature: f.name, SP: f.sizeStoryPoints, RevenuePerSP: e.revenuePerSp, CostPerSP: e.costPerSp, ProfitPerSP: e.profitPerSp, MarginPerSPpct: Math.round(e.marginPerSpPct * 100) };
  });
  saveXlsx(rows, 'SP Economics', 'opus-pulse-sp-economics.xlsx');
}

// ── Pipeline / win-loss (Excel) ───────────────────────────────────────────────
export function pipelineExcel(s: AppState) {
  const rows = s.deals.map((d) => ({ Deal: d.name, Client: s.clients.find((c) => c.id === d.clientId)?.name, Model: DELIVERY_MODEL_LABEL[d.modelType], Price: d.price.amount, Currency: d.price.currency, MarginPct: Math.round(d.marginPct * 100), Stage: d.stage, WinProbability: d.winProbability, Reason: d.winLossReason ?? '' }));
  saveXlsx(rows, 'Pipeline', 'opus-pulse-pipeline.xlsx');
}

// ── Utilization (Excel) ───────────────────────────────────────────────────────
export function utilizationExcel(s: AppState) {
  const rows = s.utilizationRecords.map((u) => {
    const e = s.employees.find((x) => x.id === u.employeeId);
    return { Resource: e?.name, Team: e?.teamId, BillableHours: u.billableHours, AvailableHours: u.availableHours, UtilizationPct: Math.round(u.utilizationPct * 100), Status: e?.status };
  });
  saveXlsx(rows, 'Utilization', 'opus-pulse-utilization.xlsx');
}

// ── Customer profitability (Excel) ────────────────────────────────────────────
export function customerProfitabilityExcel(s: AppState) {
  const byClient: Record<string, { rev: number; cost: number }> = {};
  s.projects.forEach((p) => {
    const e = projectEconomics(p, s.allocations, s.employees);
    byClient[p.clientId] = byClient[p.clientId] ?? { rev: 0, cost: 0 };
    byClient[p.clientId].rev += e.revenueMonthlyUsd;
    byClient[p.clientId].cost += e.costMonthlyUsd;
  });
  const rows = Object.entries(byClient).map(([cid, v]) => ({ Customer: s.clients.find((c) => c.id === cid)?.name, MonthlyRevenue: Math.round(v.rev), MonthlyCost: Math.round(v.cost), MarginPct: Math.round(((v.rev - v.cost) / v.rev) * 100) }));
  saveXlsx(rows, 'Customer Profitability', 'opus-pulse-customer-profitability.xlsx');
}

// ── Registry used by the Reports screen ───────────────────────────────────────
export interface ReportDef {
  key: string;
  title: string;
  audience: 'External' | 'Internal';
  requires?: keyof (typeof ROLES)['cdo']['can'];
  formats: { label: string; run: (s: AppState) => void }[];
  note: string;
}

export const REPORTS: ReportDef[] = [
  { key: 'proposal', title: 'Client proposal pack', audience: 'External', note: 'Scope, milestones, price, timeline — no internal cost/margin/marketplace.', formats: [{ label: 'PDF', run: clientProposalPdf }, { label: 'PPT', run: clientProposalPptx }] },
  { key: 'margin', title: 'Internal margin pack', audience: 'Internal', requires: 'margin', note: 'Loaded cost, margin, risk — internal only.', formats: [{ label: 'PDF', run: marginPackPdf }, { label: 'Excel', run: marginPackExcel }] },
  { key: 'forecast', title: 'Forecast report', audience: 'Internal', requires: 'margin', note: 'Per-project annual billing, actual vs forecast.', formats: [{ label: 'Excel', run: forecastExcel }] },
  { key: 'sp', title: 'Story Point economics', audience: 'Internal', requires: 'margin', note: 'Revenue/Cost/Profit/Margin per SP by feature.', formats: [{ label: 'Excel', run: spEconomicsExcel }] },
  { key: 'pipeline', title: 'Pipeline & win/loss', audience: 'Internal', requires: 'margin', note: 'Deals by stage, win-rate, reasons.', formats: [{ label: 'Excel', run: pipelineExcel }] },
  { key: 'util', title: 'Utilization & bench', audience: 'Internal', note: 'Utilization % and bench by resource/team.', formats: [{ label: 'Excel', run: utilizationExcel }] },
  { key: 'custprofit', title: 'Customer profitability', audience: 'Internal', requires: 'margin', note: 'Margin by customer; ranked profitability.', formats: [{ label: 'Excel', run: customerProfitabilityExcel }] },
];
