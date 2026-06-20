# Opus Pulse — Delivery Economics & Outcome Engineering Platform

Working React UI for the Opus Pulse platform (BRD v1.2). This phase is **frontend-only**: realistic mock data + client-side calculation engines, with every screen interactive. No backend, SSO, or live integrations yet — the data shapes and engine interfaces are designed to wire to a real backend later without reworking the UI.

See [OpusPulseRequirement.md](OpusPulseRequirement.md) (the BRD) and [implementationplan.md](implementationplan.md) (the build plan).

## Run

```bash
npm install
npm run dev        # dev server (Vite)
npm run build      # production build
npm test           # unit tests (Vitest)
```

Open the printed `localhost` URL (default `http://localhost:5173`).

## What's inside

- **React 18 + TypeScript + Vite**, **Ant Design** UI, **Recharts** charts, **Zustand** (localStorage-persisted) state.
- **17 screens (S1–S17)** covering BRD Modules A–P.
- **Deterministic engines** (`src/engines/`): TNM billing, margin, capacity, outcome + multi-model pricing, SP economics, marketplace, simulator, change requests, revenue recognition, FX exposure, utilization. Calibrated to the BRD tokenization worked example (240 SP, $75k TNM vs ~$90k outcome, 20% → 33% → ~50% margin).
- **Rules-based AI advisory** (`src/ai/`): margin-risk, conversion score, revision probability, attrition risk, win probability — explainable & overridable.
- **RBAC role switcher** (top bar): flip between the 7 personas and watch salary/attrition hide, the Marketplace gate, and client exports strip sensitive data.
- **Real exports** (`src/reports.ts`): PDF (jsPDF), Excel (SheetJS), PPT (pptxgenjs) — RBAC-filtered.
- **Reset demo data** (top bar) restores the seed.

## Project layout

```
src/
  types.ts            domain model (BRD §12 ERD)
  store.ts            Zustand store (data + config + RBAC + lifecycle)
  utils.ts            money/FX/format/date helpers
  selectors.ts        derived hooks (economics, risk signals)
  mock/seed.ts        coherent seed portfolio
  engines/            pure deterministic calc engines
  ai/                 rules-based AI advisory mocks
  rbac/roles.ts       7 personas + capability matrix
  components/         layout, charts, shared UI
  screens/            S1–S17
  reports.ts          PDF/Excel/PPT builders
```

## Demo tips

- Start as **CDO** (full visibility). Switch to **Delivery Manager** to see salary, margin, marketplace, and attrition disappear.
- **Outcome pricing** (S6): drag the levers — price stays clamped at/above the floor.
- **Margin detail** (S3): raise the appraisal hike to watch margin erode toward the floor.
- **Change requests** (S12) → **Approvals** (S17): submit a CR, switch to CDO/Finance, approve it.
- **Reports** (S10): export the client proposal pack — it carries no cost/margin/marketplace data.
