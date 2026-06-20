# Opus Pulse — Frontend Implementation Plan (Phase: Working UI)

**Source:** [OpusPulseRequirement.md](OpusPulseRequirement.md) (BRD v1.2)
**This plan covers:** A complete, interactive React frontend with mock seed data and live user-entered values. Every screen (**S1–S17**, including the v1.2 governance/lifecycle modules K–P) renders and works; all deterministic calculations run client-side; "AI" outputs are rules-based mocks; reports export for real. **No real backend, SSO, or source-system integration in this phase.**

> **Review note:** This is the plan to approve before any code is written. Decisions already confirmed: **Ant Design** UI library, **mock data + client-side calculation engines**, **real client-side PDF/Excel/PPT export**.

---

## 1. Objective & guiding principles

Build the *entire* Opus Pulse UI in a working state so stakeholders can click through the real product experience, edit values, and see numbers recompute live — backed by mock data, not a server.

Principles carried from the BRD:
1. **Engines compute, AI advises.** Deterministic math lives in pure, testable TypeScript functions. "AI" panels are clearly-labelled rules-based heuristics that read engine outputs — swappable for real services later.
2. **Effective-dating & native currency are first-class** on every monetary value, even in mock data, so the data shapes don't need to change when a backend arrives.
3. **RBAC is visible from day one.** A role switcher controls what data each persona sees (salary hidden from Delivery, marketplace savings never in client exports, etc.).
4. **Every input is live.** User edits to levers, calendars, and scenarios recompute instantly and persist locally.
5. **Mock data is realistic** and matches the BRD's worked examples (tokenization: 240 SP, $75k TNM vs $90k outcome, 20% → 33% → 50% margin) so demos line up with the document.

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast dev server / HMR; first-class React + TS template. |
| Language | **React 18 + TypeScript** | Per BRD §7.1. |
| UI library | **Ant Design (antd v5)** | Richest enterprise component set (data tables, forms, drawers, date pickers) → fastest path to a polished working UI. |
| Charts | **Recharts** | Per BRD §7.1; trend lines, bars, donuts, waterfall (margin bridge). |
| State | **Zustand** + `persist` middleware | Lightweight global store; localStorage persistence for user edits and scenarios. |
| Routing | **React Router v6** | Nested layout + 11 screen routes. |
| Money/format | **dinero.js** (or a small money util) + **Intl.NumberFormat** | Native-currency storage, base-currency display, consistent formatting. |
| Dates | **dayjs** | antd's native date lib; calendar/effective-dating math. |
| PDF export | **jsPDF** + **jspdf-autotable** | Client-side proposal & margin packs. |
| Excel export | **SheetJS (xlsx)** | Forecast / SP-economics / scenario workbooks. |
| PPT export | **pptxgenjs** | Client proposal pack (PPT). |
| Tests | **Vitest** + **@testing-library/react** | Unit-test the calc engines (highest value) + key components. |
| Lint/format | **ESLint + Prettier** | Consistency. |

> No backend, no auth provider, no database in this phase. RBAC is simulated entirely client-side.

---

## 3. Project structure

```
opus-pulse/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
├─ src/
│  ├─ main.tsx                 # app bootstrap, antd ConfigProvider (theme), router
│  ├─ App.tsx                  # AppLayout + routes
│  ├─ theme/
│  │  └─ theme.ts              # antd token overrides (brand colors, density)
│  ├─ types/                   # TypeScript domain model (mirrors BRD §12 ERD)
│  │  ├─ employee.ts  client.ts  sow.ts  project.ts  billRate.ts  allocation.ts
│  │  ├─ calendar.ts  feature.ts  milestone.ts  sprint.ts  velocity.ts
│  │  ├─ scenario.ts  accelerator.ts  riskSignal.ts  costLineItem.ts  fxRate.ts
│  │  ├─ user.ts  role.ts  appraisalCycle.ts  auditEvent.ts          # RBAC + audit + cost
│  │  ├─ changeRequest.ts  revenueRecognition.ts  alert.ts           # Modules K, L, M
│  │  ├─ deal.ts  utilization.ts  approval.ts                        # Modules N, O, P
│  │  └─ index.ts
│  ├─ mock/                    # seed data (typed) + generators
│  │  ├─ employees.ts  clients.ts  projects.ts  rates.ts  calendars.ts  allocations.ts
│  │  ├─ features.ts  velocity.ts  accelerators.ts  costCatalogue.ts  fxRates.ts
│  │  ├─ users.ts  changeRequests.ts  revenue.ts  alerts.ts  deals.ts  approvals.ts
│  │  └─ seed.ts               # assembles a coherent portfolio
│  ├─ engines/                 # PURE deterministic functions (no React)
│  │  ├─ tnm.ts                # Module B: billable days/hours, billing, forecast
│  │  ├─ margin.ts             # Module C: loaded cost, margin, appraisal/attrition
│  │  ├─ capacity.ts           # Module E: velocity, available days, confidence band
│  │  ├─ outcomePricing.ts     # Module F: cost-to-deliver, floor, price + multi-model (FR-F8)
│  │  ├─ spEconomics.ts        # Module I: revenue/cost/profit/margin per SP
│  │  ├─ marketplace.ts        # Module J: effort saved, margin uplift, TNM vs outcome
│  │  ├─ simulator.ts          # Module G: swap / offshore / team-size / automation
│  │  ├─ changeRequest.ts      # Module K: re-size + re-price CR (reuses capacity+pricing)
│  │  ├─ revenueRecognition.ts # Module L: recognized/billed/WIP per model policy
│  │  ├─ fxExposure.ts         # Module C/FR-C6: FX exposure on fixed-price commitments
│  │  ├─ utilization.ts        # Module O: utilization %, bench cost
│  │  └─ __tests__/            # Vitest specs validating BRD worked examples
│  ├─ ai/                      # Module D: rules-based, explainable, overridable mocks
│  │  ├─ marginRisk.ts         # erosion score, Revise/Convert/Exit, top-3 drivers
│  │  ├─ conversionScore.ts  revisionProbability.ts  attritionRisk.ts
│  │  ├─ winProbability.ts     # cold-start bid win-probability heuristic (§10)
│  │  └─ pricingAdvisor.ts     # tunes within engine hard constraints
│  ├─ store/                   # Zustand slices
│  │  ├─ useDataStore.ts       # portfolio data + CRUD edits (persisted)
│  │  ├─ useScenarioStore.ts   # saved/cloned scenarios (persisted)
│  │  ├─ useRbacStore.ts       # current role + visibility helpers
│  │  ├─ useAlertStore.ts      # alerts/notifications + ack/snooze (Module M)
│  │  ├─ useApprovalStore.ts   # approvals inbox + decisions (Module P)
│  │  ├─ useDealStore.ts       # deal pipeline + win/loss (Module N)
│  │  ├─ useChangeRequestStore.ts # CR register per engagement (Module K)
│  │  └─ useConfigStore.ts     # overhead formula, FX policy, SP→hrs, rev-rec policy,
│  │                           #   approval thresholds, alert rules, utilization targets
│  ├─ rbac/
│  │  ├─ roles.ts              # 7 personas (BRD §4) + permission matrix
│  │  └─ guards.tsx            # <RequireField>, useCanSee('salary') hooks
│  ├─ components/              # shared, reusable
│  │  ├─ AppLayout.tsx  SideNav.tsx  TopBar.tsx  RoleSwitcher.tsx
│  │  ├─ KpiCard.tsx  GapHeadline.tsx  MoneyText.tsx  ConfidenceBand.tsx
│  │  ├─ charts/ (TrendChart, ComparisonBar, ModelMixDonut, MarginBridge)
│  │  ├─ LeverSlider.tsx  DriverList.tsx  RbacHiddenTag.tsx  ExportMenu.tsx
│  │  └─ DataTable.tsx         # wrapper around antd Table (sort/filter/export)
│  ├─ screens/                 # one folder per screen S1–S17
│  │  ├─ ExecutiveDashboard/   # S1
│  │  ├─ BillingForecast/      # S2
│  │  ├─ MarginDetail/         # S3
│  │  ├─ MarginRiskAI/         # S4
│  │  ├─ CapacityPlanner/      # S5
│  │  ├─ OutcomePricing/       # S6
│  │  ├─ ComparisonWorkbench/  # S7
│  │  ├─ StoryPointEconomics/  # S8
│  │  ├─ DeliveryMarketplace/  # S9
│  │  ├─ Reports/              # S10
│  │  ├─ Admin/                # S11
│  │  ├─ ChangeRequests/       # S12 (Module K)
│  │  ├─ RevenueWip/           # S13 (Module L)
│  │  ├─ Alerts/               # S14 (Module M)
│  │  ├─ DealPipeline/         # S15 (Module N)
│  │  ├─ Utilization/          # S16 (Module O)
│  │  └─ Approvals/            # S17 (Module P)
│  ├─ reports/                 # export builders
│  │  ├─ pdf.ts  excel.ts  ppt.ts
│  │  └─ templates/ (proposalPack, marginPack, forecast, scenario, custProfit, spEcon,
│  │                 changeOrder, revenueWip, pipeline, utilization)
│  └─ utils/ (money.ts, fx.ts, date.ts, format.ts, id.ts)
└─ implementationplan.md
```

---

## 4. Domain model (TypeScript) — mirrors BRD §12 ERD

We mirror the ERD so mock data shapes survive a future backend. Core entities and their key fields:

- **Employee** — id, name, role, level/grade, country, baseSalary, currency, joinDate, status, **costLineItems[]** → derived `loadedCost`.
- **CostLineItem** — component (base/variable/statutory/insurance/infra/hardware/software/training/travel/overhead/bench), value, currency, scope (global|country|band|resource) — *most-specific-wins* (FR-A2a).
- **Client → SOW → Project → Allocation(Employee)** chain. SOW carries `modelType` (TNM | managed-capacity | gain-share | outcome | outcome+warranty), `hoursPerDay` (8|9), `fxPolicy`, `marginFloor`, dates.
- **BillRate** — client × role × location × tenureBand, rate, currency, **effectiveFrom/effectiveTo** (FR-A3, FR-A5).
- **Calendar** — country, weekends, holidays[]; **LeaveRecord** per employee (FR-B1).
- **Feature → Story / Milestone**, `sizeStoryPoints`, `riskBufferPct`.
- **Sprint → VelocityRecord** (completedPoints, availableDays per employee).
- **Scenario** — name, `assumptions` (JSON), `result` (JSON) — saved/cloned (FR-G3).
- **Accelerator** + **AssetApplication** (estEffortSaved, actualEffortSaved, marginUplift).
- **RiskSignal** — conversionScore, revisionProbability, attritionRisk, backfillCostDelta, classification.
- **User / Role** — back RBAC and audit attribution; **AuditEvent** — who/what/when/before/after.
- **FxRate** — effective-dated currency pairs under the FX policy; **AppraisalCycle** — scope, hike %, cycle date.
- **Allocation** — project↔employee with allocation %, billable flag, dates (drives proration + utilization).
- **ChangeRequest** (Module K) — type, deltaStoryPoints, deltaPrice, marginImpact, status, approvalRef.
- **RevenueRecognition** (Module L) — policy, recognized, billed, wipUnbilled per project/milestone/period.
- **Alert** (Module M) — type, sourceRef, severity, driver, status (new/ack/resolved/snoozed).
- **Deal** (Module N) — model, price, margin, stage, owner, winLossReason, linked scenario(s).
- **UtilizationRecord** (Module O) — billable vs available hours, utilization %, per resource/period.
- **Approval** (Module P) — actionType, actionRef, approver, status, reason, decidedAt.

All monetary fields are `{ amount: number, currency: string }`; every rate/cost/price record is effective-dated.

---

## 5. Mock seed data (BRD-aligned)

`src/mock/seed.ts` assembles a coherent ~realistic portfolio so every screen has something to show:

- **~30–40 employees** across India ($30–50/hr cost basis) and US/UK/Canada ($150–200/hr), with full cost line-items.
- **4–6 clients**, **6–10 projects** spanning all five delivery models, including the **tokenization** pilot project that matches Appendix A exactly.
- **Bill-rate matrix** with at least one future-dated revision (to demo AC-A1).
- **Country calendars** (India vs US) with differing holidays; sample leave records.
- **Velocity history** (last 6 sprints) per team so capacity is derived from real data, not a flat "8 points each."
- **Accelerators** (GenAI codegen, reusable framework) with effort-saved factors matching the §J worked example (25% / 300 hrs).
- **Allocations** (incl. partly-benched resources), **FX rates** (USD/INR/GBP/CAD), **users/roles** for the 7 personas, and seed **audit events**.
- **Change requests** on the tokenization deal (e.g. a +40 SP add) to demo re-pricing & approval; **deals** across all pipeline stages with win/loss reasons; **alerts** (a margin-floor breach, a milestone overdue, a renewal window); **rev-rec/WIP** rows per model; **utilization** records (some under-, some over-allocated).
- Numbers calibrated so the tokenization deal reproduces: 240 SP, 80 SP/sprint, 3 sprints, $75k TNM / $90k outcome, 20% → 33% → ~50% margin.

Mock data is the *seed*; user edits layer on top in the Zustand store and persist to localStorage. A **"Reset demo data"** action restores the seed.

---

## 6. Calculation engines (deterministic, pure) — the core

These are framework-free TS modules, unit-tested against the BRD worked examples. They are the source of truth every screen reads from.

| Engine | BRD module | Key functions |
|---|---|---|
| `tnm.ts` | B | `billableDays(employee, period, calendar, leaves)`, `billableHours()`, `billingIncome(hours, rate)`, `annualForecast(opts)`, `prorate(joiner/leaver)` |
| `margin.ts` | C | `loadedCost(employee, catalogue)`, `marginPct(rev, cost)`, `applyAppraisal(pct, cycleDate)`, `applyAttrition(delta, rampLoss)`, `projectMarginCurve(months)`, `monthsToFloor()` |
| `capacity.ts` | E | `referenceVelocity(records, k)`, `availableDays(sprint, leaves, holidays, ceremony, ramp)`, `predictedCapacity(focusFactor)` → `{ point, low, high }` confidence band |
| `outcomePricing.ts` | F | `costToDeliver(team, duration)`, `tnmRunRate(period)`, `priceFloor(cost, minMargin)`, `recommendedPrice()` clamped to `max(floor, tnmRunRate) + riskBuffer`, `estimationIntegrityCheck(size, history)`, **`priceModel(model)`** for managed-capacity / gain-share / outcome+warranty (FR-F8) |
| `spEconomics.ts` | I | `revenuePerSP`, `costPerSP`, `profitPerSP`, `marginPerSP`; rollups by customer/feature/team/PI |
| `marketplace.ts` | J | `effortSaved(asset, feature)`, `adjustedCost()`, `marginUplift()`, `tnmVsOutcomeRetention()` |
| `simulator.ts` | G | `swapResource()` (incl. ramp dip + KT cost), `offshoreShift(share)` (+risk flag), `resizeTeam(n)`, `applyAutomation(gainPct)`, `nextMigrationRung()` (FR-G5) |
| `changeRequest.ts` | K | `sizeCR()` (reuses capacity), `repriceCR(model)` (floor-clamped), `marginImpact()`, `revisedTimeline()` |
| `revenueRecognition.ts` | L | `recognize(model, milestones, period)` → `{ recognized, billed, wipUnbilled, deferred }`, `acceptanceAgeing()` |
| `fxExposure.ts` | C | `fxExposure(priceCcy, costCcy, fxRates)` + material-risk flag (FR-C6) |
| `utilization.ts` | O | `utilizationPct(allocations, capacity)`, `benchCost()`, `targetVsActual()` |

**Hard rules enforced in code** (BRD §9, FR-F4): `priceFloor = loadedCost / (1 − minMargin)`; recommended price (and every fixed-component model price) is clamped to `max(priceFloor, tnmRunRate)`. The pricing screen — and CR re-pricing — physically cannot show a price below the floor.

---

## 7. Mock AI layer (Module D) — rules-based, explainable, overridable

Clearly badged **"AI advisory (rules-based)"**. Each produces a score **and** the explainable drivers the BRD demands:

- `marginRisk.ts` → probability of breaching margin floor within N months + **Revise / Convert / Exit** class + **top-3 drivers** (appraisal compounding, backfill gap, rate age, attrition signal).
- `conversionScore.ts` → Outcome-Conversion Score 0–100 (FR-D6).
- `revisionProbability.ts` → Billing-Revision Probability 0–100% (FR-D7).
- `attritionRisk.ts` → per-position attrition probability + backfill-cost delta (FR-D8). **Position-level only**, gated to HR/Finance/leadership, excluded from delivery views and all exports (ethics guardrail, §10).
- `winProbability.ts` → cold-start bid win-probability heuristic; in the full product it would learn from Module N closed deals (§10).
- `pricingAdvisor.ts` → tunes price-per-point within the engine's hard constraints (never below floor).

Each mock carries a stub `driversExplainer()` so the UI can show SHAP-style drivers, and a `version` tag to mirror the real model-monitoring contract.

**Overrides** (AC-D2) are recorded with user, timestamp, reason into the store and shown in an audit panel. Overrides that cross an approval threshold route through the Approvals store (Module P).

---

## 8. State, RBAC & config

- **`useDataStore`** — the portfolio (seed + user edits), CRUD actions, "reset demo data". Persisted.
- **`useScenarioStore`** — save / clone / compare named scenarios (FR-G3). Persisted.
- **`useChangeRequestStore`** — CR register, re-pricing results, approval status (Module K). Persisted.
- **`useDealStore`** — pipeline stages, win/loss capture, win-rate analytics (Module N). Persisted.
- **`useAlertStore`** — generated alerts, ack/snooze/resolve lifecycle, digest subscriptions (Module M). Persisted.
- **`useApprovalStore`** — approvals inbox, decisions with reason, multi-step routing (Module P). Persisted.
- **`useConfigStore`** — overhead formula, FX policy + base currency, default holidays/leaves (10/21 overridable), SP→hours per team (FR-I2), **rev-rec policy per model**, **approval thresholds**, **alert threshold rules**, **utilization targets**. Persisted.
- **`useRbacStore`** — current persona; visibility helpers like `canSee('salary')`, `canSee('marketplace')`, `canSee('clientRate')`, `canSee('attrition')`, `canApprove(actionType)`.

**RBAC matrix (BRD §4)** drives:
- Salary/individual cost → Finance, HR Admin, CDO only; **hidden** (shown as `••• [restricted]`) for Delivery/others (AC-A3).
- Delivery Marketplace (Module J) → commercial/finance/delivery-leadership only (FR-J5).
- Individual attrition predictions → HR/Finance/leadership only; never in delivery views or exports (§10 ethics guardrail).
- Approvals inbox & decisions → approver roles per the threshold matrix (Module P).
- Alerts → RBAC-filtered (a delivery role never sees a compensation-derived alert detail, AC-M2).
- Client-facing exports → never include cost, margin, marketplace savings, or attrition (AC-H2, AC-J3, FR-J5).

A **Role Switcher** in the top bar lets reviewers flip personas and watch the UI adapt live — the most tangible way to demo RBAC without auth.

---

## 9. Layout & navigation

`AppLayout` = antd `Layout` with a left `SideNav` (17 screens grouped: **Overview** (S1) / **Economics** (S2, S3, S8, S13, S16) / **Intelligence** (S4, S14) / **Workbench** (S5, S6, S7, S12) / **Commercial** (S15, S17) / **Marketplace** (S9) / **Admin** (S11) / **Reports** (S10)), a `TopBar` (brand, base-currency selector, role switcher, **alert bell** with unread count → S14, **approvals badge** → S17, "reset demo data"), and a content area routed by React Router. Breadcrumbs + active-route highlighting. Responsive down to tablet width.

---

## 10. Screen-by-screen build (S1–S11)

Each screen lists **what's shown (dummy)** and **what the user can edit (live)**. Every screen reads from engines/store so edits anywhere propagate.

### S1 — Executive dashboard *(Module H / overview)*
- **Shows:** portfolio margin % KPI + trend sparkline, at-risk engagement ranking (from AI layer), annual billing forecast, **model-mix donut** (TNM/managed/gain-share/outcome split).
- **Edit:** base-currency toggle; drill-through links to project screens; date-range filter.

### S2 — Billing & forecast *(Module B)*
- **Shows:** per-resource & per-project billable hours, yearly billing income, **actual-to-date vs projected-remaining split** (AC-B3), worked-example numbers.
- **Edit:** country **calendar selector**, holidays/leaves, hours/day (8|9), join/leave dates → billing recomputes instantly (AC-B1, AC-B2).

### S3 — Margin detail *(Module C)*
- **Shows:** margin trend chart, **margin-bridge waterfall**, cost breakdown by line-item, months-to-floor, margin-floor breach flag.
- **Edit:** **appraisal % lever** (e.g. 7%) + cycle date, **attrition/backfill lever**, ramp loss → re-projected curve (AC-C1).

### S4 — Margin-risk (AI) *(Module D)*
- **Shows:** ranked engagement list with **Revise/Convert/Exit tags**, top-3 drivers per row, recommended action, conversion score / revision probability / attrition risk columns.
- **Edit:** **override** a recommendation (records user/time/reason → audit) (AC-D1, AC-D2).

### S5 — Capacity planner *(Module E)*
- **Shows:** per-resource & team velocity from real history, available-days breakdown, **confidence band** (never a single number), feature timeline (e.g. 240 SP → 3 sprints).
- **Edit:** focus factor (0.7–0.8), sprint/ceremony overhead, ramp factor, team selection (AC-E1, AC-E2).

### S6 — Outcome pricing *(Module F)*
- **Shows:** feature sizing, cost-to-deliver, **TNM run-rate floor**, AI-recommended price, **floor guardrail indicator**, estimation-integrity flag, **multi-model price tabs** (outcome / managed-capacity / gain-share / outcome+warranty, FR-F8).
- **Edit:** levers — resource count, resource mix/swap, SP size, velocity, price-per-point, milestone cadence, target margin → price/timeline/margin update **live** across all models; price never drops below floor (AC-F1, AC-F2, AC-F3, AC-F4).

### S7 — Comparison workbench *(Module G)*
- **Shows:** **TNM vs Outcome side-by-side**, the **gap as a single prominent headline number + chart** (AC-G2), multi-model comparison across the ladder (FR-G4), per-engagement **migration planner** (current rung → recommended next rung → target date, FR-G5), scenario list.
- **Edit:** resource-swap simulator (incl. ramp + KT cost, AC-G1), offshore-shift (with risk flag), team-size, automation/GenAI gain; **save / clone / compare** scenarios (AC-G3, AC-G4); set migration target dates.

### S8 — Story Point Economics *(Module I)*
- **Shows:** Revenue/SP, Cost/SP, Profit/SP, Margin/SP by customer & feature; **ranking table**; PI trend chart; tokenization worked example ($375 vs $312.5 /SP).
- **Edit:** team-specific **SP→hours config** (FR-I2, AC-I2); ranking sort (AC-I3).

### S9 — Delivery Marketplace *(Module J — internal only)*
- **Shows:** accelerator catalogue with effort-saved factors, **margin-uplift simulator**, **TNM-vs-outcome retention comparison** (AC-J2), realized-vs-estimated tracking.
- **Edit:** apply an accelerator to a feature → effort saved, new cost, margin uplift (AC-J1). **Entire screen gated by RBAC**; an explicit banner states "Internal only — never shown to clients" (FR-J5).

### S10 — Reports *(Module H)*
- **Shows:** template chooser (proposal pack / margin pack / forecast / scenario / customer profitability / SP economics), live preview.
- **Edit/Action:** generate **real PDF / Excel / PPT** from current data, RBAC-filtered (AC-H1, AC-H2). Client proposal pack provably excludes cost/margin/marketplace savings.

### S11 — Admin *(Module A + config)*
- **Shows:** RBAC matrix viewer, audit-log viewer (overrides, rate/cost changes, approvals).
- **Edit:** employee master data, bill-rate matrix (effective-dated, AC-A1), **cost line-item catalogue** (FR-A2a), **overhead formula** (AC-A2), FX policy + base currency, country calendars, **rev-rec policy per model**, **approval thresholds**, **alert rules**, **utilization targets**, users/roles.

### S12 — Change requests *(Module K)*
- **Shows:** CR register per engagement; each CR's incremental size, cost, re-price (floor-clamped), **margin impact**, revised timeline, approval status; scope-volatility metrics.
- **Edit:** raise a CR (add/modify/descope), re-size, re-price by model, submit for approval (AC-K1, AC-K2, AC-K3).

### S13 — Revenue & WIP *(Module L)*
- **Shows:** recognized vs. billed vs. **WIP/unbilled & deferred** per project and portfolio; rev-rec policy by model; **milestone-acceptance ageing** with cash-flow-risk flags (AC-L1, AC-L2, AC-L3).
- **Edit:** mark milestone acceptance → revenue recognizes live; toggle policy (acceptance vs % completion).

### S14 — Alerts / Notification center *(Module M)*
- **Shows:** per-user **inbox** of RBAC-filtered alerts with severity, driver, and link to source (margin-floor breach, milestone overdue, renewal window, attrition spike, etc.); top-bar bell unread count.
- **Edit:** acknowledge / snooze / resolve (audited); manage digest subscriptions; configure threshold rules (admin) (AC-M1, AC-M2, AC-M3).

### S15 — Deal pipeline *(Module N)*
- **Shows:** **stage board** (draft → submitted → negotiation → won/lost/withdrawn) with deal cards (model, price, margin, owner, linked scenario); win-rate, average margin, and turnaround analytics; win-probability hint.
- **Edit:** create/move deals, capture win/loss reason and final agreed model/price (AC-N1, AC-N2, AC-N3).

### S16 — Utilization & bench *(Module O)*
- **Shows:** **utilization %** per resource/team/practice (billable vs available), quantified **bench cost**, target-vs-actual trend, under-/over-utilization flags (AC-O1, AC-O2).
- **Edit:** adjust allocations / billable flags → utilization and bench cost recompute live; set utilization targets.

### S17 — Approvals inbox *(Module P)*
- **Shows:** approver's **pending queue** with full action context (sub-target price, rate revision, override, large CR), and status on each source record (AC-P1, AC-P2).
- **Edit:** approve / reject with reason (audited); multi-step routing where policy requires; governed actions stay blocked until approved.

---

## 11. Reports & export (real, client-side)

`reports/` builds actual files:
- **PDF** (jsPDF + autotable): proposal pack, margin pack, AI recommendations, change-order register, revenue & WIP, pipeline/win-loss, utilization.
- **Excel** (SheetJS): forecast, SP economics, customer profitability, scenario comparison, change-order register, revenue & WIP, pipeline, utilization.
- **PPT** (pptxgenjs): client proposal pack.

Every export passes through an **RBAC filter** so the active role determines content. A unit test asserts the client proposal pack contains **no** cost/margin/marketplace/attrition fields (enforces FR-J5 / AC-J3 / AC-H2 / §10 ethics).

---

## 12. Theming & UX polish

- antd `ConfigProvider` with brand tokens (primary color, compact-ish density for data screens).
- Consistent KPI cards, gap headlines, confidence bands, "restricted" tags, and AI-advisory badges as shared components.
- Chart palette consistent across screens; margin-floor breaches in a warning color.
- Empty/loading/error states; "Reset demo data" and per-screen "Recompute" affordances.

---

## 13. Build milestones (incremental, each independently runnable)

| Milestone | Contents | Result |
|---|---|---|
| **M0 — Scaffold** | Vite+TS+antd+router+Zustand, theme, AppLayout, SideNav, RoleSwitcher, empty routed screens | App boots; nav works; role switching toggles a sample restricted field |
| **M1 — Data & engines** | Domain types, seed mock data, TNM + margin engines, SP→hrs config, unit tests vs worked examples | Engines green; numbers match Appendix A |
| **M2 — Foundation screens** | S11 Admin (master data CRUD), S2 Billing, S3 Margin | Edit data → billing & margin recompute live |
| **M3 — Capacity & pricing** | capacity + outcomePricing + simulator engines; S5, S6, S7 | Live levers; floor guardrail; scenario save/compare |
| **M4 — Economics & intelligence** | spEconomics + marketplace + utilization + winProbability engines/AI; S8, S9, S4, S16 | SP economics, marketplace (RBAC-gated), risk ranking + overrides, utilization & bench |
| **M5 — Governance & lifecycle** | changeRequest + revenueRecognition + fxExposure engines; alert/approval/deal stores; S12, S13, S14, S15, S17 + top-bar bell/approvals badge | Scope control, rev-rec/WIP, early-warning alerts, pipeline, maker-checker approvals |
| **M6 — Dashboard & reports** | S1 executive dashboard (incl. migration/model-mix); S10 reports with real PDF/Excel/PPT export (all templates) | Full click-through; downloadable RBAC-correct reports |
| **M7 — Polish** | Empty/error states, responsive pass, a11y (WCAG AA) pass, README, final test pass | Demo-ready |

Roughly maps to BRD phased roadmap (§18) but compressed to a single frontend track since there's no backend yet. M5 carries the v1.2 governance modules (K, L, M, N, P); utilization (O) lands in M4 alongside the other economics views.

---

## 14. Out of scope this phase (future / explicitly deferred)

- Real backend (FastAPI/NestJS), PostgreSQL, async jobs.
- SSO/SAML/OIDC, real auth (RBAC is simulated client-side only).
- Live HRMS / Jira / ERP integrations and ingestion/normalization.
- Real ML models (current AI = rules-based mocks behind a swappable interface), incl. model monitoring/drift/retraining.
- Server-side report generation, immutable server audit trail, true multi-user concurrency.
- **Real email/notification delivery** — alerts (M) appear in-app; digests are simulated (no SMTP/SES).
- **Cross-user approval routing** (P) is simulated client-side via the role switcher (one browser, switch persona to approve); no real multi-user workflow.
- Data residency, retention/archival, backup/DR — NFR concerns deferred with the backend.

The data shapes, engine interfaces, and AI interfaces are designed so these can be wired to a real backend later **without reworking the UI**.

---

## 15. Definition of done (this phase)

1. All 17 screens (S1–S17) render and are navigable; no dead links.
2. Engines reproduce the BRD worked examples (verified by unit tests): tokenization 240 SP, 20% → 33% → ~50% margin, $375 vs $312.5 rev/SP.
3. Editing any input (calendar, levers, sizing, swaps, accelerators, allocations, CRs, master data) recomputes dependent screens live and persists across reload.
4. Outcome price — and every floor-respecting model price and CR re-price — is never below `max(priceFloor, tnmRunRate)` under any lever combination.
5. Role switching changes visible data: salary & attrition hidden from Delivery; Marketplace gated; approvals/alerts RBAC-filtered; client proposal export excludes cost/margin/savings/attrition.
6. A change request re-prices and routes through approval before a milestone price changes; the change is audited.
7. Revenue recognizes on milestone acceptance; recognized/billed/WIP reconcile per project and portfolio.
8. Threshold breaches raise alerts in the notification center with driver + link; ack/snooze/resolve are audited.
9. Deals move through the pipeline; win-rate and turnaround compute; win/loss reasons are captured.
10. Utilization % and bench cost compute per resource/team and respond to allocation edits.
11. Sensitive actions (sub-target price, rate revision, override, large CR) stay blocked until approved in the inbox.
12. Reports export to real PDF, Excel, and PPT with RBAC-correct content (all templates).
13. "Reset demo data" restores the seed.

---

## 16. Open decisions for your review

1. **Brand / theme** — any color palette, logo, or product styling to apply, or use a clean neutral default?
2. **Mock data volume** — is ~30–40 employees / 6–10 projects the right size for demos, or do you want closer to the BRD's 1,000-employee scale (synthetic-generated)?
3. **Personas to ship first** — RBAC covers all 7; should the demo default to CDO (full visibility), or a specific role?
4. **Scope confirmation** — the plan now spans **17 screens / Modules A–P** (BRD v1.2). Anything to add, cut, or resequence before I start M0? (e.g. if the governance modules K–P are lower priority for the first demo, I can defer M5 and ship S1–S11 + S16 first.)

---

*End of implementation plan — awaiting review before development begins.*
