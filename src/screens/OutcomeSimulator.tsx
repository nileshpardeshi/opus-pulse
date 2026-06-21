import { useMemo, useState, useEffect } from 'react';
import { Row, Col, Card, Select, Slider, InputNumber, Form, Tag, Typography, Space, Alert, Table, List, Statistic, Button, App } from 'antd';
import { BulbOutlined, CheckCircleOutlined, WarningOutlined, RiseOutlined, SmileOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { PageHeader, KpiCard, AiBadge, GapHeadline } from '../components/common';
import { ComparisonBar } from '../components/charts';
import { computeBilling, computeOutcomeCase, outcomeInsight, computeMix } from '../engines';
import type { BillingConfig, DeliveryModel, OutcomeConfig } from '../types';
import { fmtMoney, fmtPct, convert, round } from '../utils';

const { Text, Paragraph } = Typography;
const MODEL_COLOR: Record<DeliveryModel, string> = { TNM: 'blue', 'Fixed Bid': 'gold', 'Outcome Based': 'green', 'Managed Capacity': 'cyan' };

export default function OutcomeSimulator() {
  const s = useStore();
  const [clientId, setClientId] = useState(s.clients[0]?.id);
  const clientProjects = s.projects.filter((p) => p.clientId === clientId);
  const [projectId, setProjectId] = useState(clientProjects[0]?.id);

  useEffect(() => { if (clientId && !clientProjects.some((p) => p.id === projectId)) setProjectId(clientProjects[0]?.id); }, [clientId]); // eslint-disable-line
  useEffect(() => { if (projectId) { s.getBilling(projectId); s.getOutcome(projectId); } }, [projectId]); // eslint-disable-line

  const client = s.clients.find((c) => c.id === clientId);
  const project = s.projects.find((p) => p.id === projectId);
  const sow = s.sows.find((w) => w.id === project?.sowId);
  const currency = client?.currency ?? 'USD';
  const billing: BillingConfig = s.billingConfigs[projectId] ?? { projectId, resources: [], hoursPerDay: 8, annualLeaves: 21, nationalHolidays: 10, expenses: [] };
  const o: OutcomeConfig = s.outcomeConfigs[projectId] ?? { projectId, hoursPerStoryPoint: 12.8, sprintsPerMonth: 2, reservePct: 0.15, caseACapacity: 7, caseBCapacity: 8, efficiencyGainPct: 0.1, clientDiscountPct: 0.05, minInvoiceSp: 120, mix: { fresherVelocityPct: 0.65, fresherReworkPct: 0.1, swaps: {} } };
  const { message } = App.useApp();

  const bill = useMemo(() => computeBilling(billing, currency), [billing, currency]);
  const headcount = bill.headcount;

  const baseInput = {
    headcount, reservePct: o.reservePct, sprintsPerMonth: o.sprintsPerMonth,
    monthlyRevenueTnm: bill.monthlyRevenue, monthlyCost: bill.monthlyExpenses,
    efficiencyGainPct: o.efficiencyGainPct, clientDiscountPct: o.clientDiscountPct, minInvoiceSp: o.minInvoiceSp,
  };
  const caseA = useMemo(() => computeOutcomeCase({ label: `Case 1 · ${o.caseACapacity} SP/person`, perPersonSp: o.caseACapacity, ...baseInput }, currency), [o, bill, headcount, currency]);
  const caseB = useMemo(() => computeOutcomeCase({ label: `Case 2 · ${o.caseBCapacity} SP/person`, perPersonSp: o.caseBCapacity, ...baseInput }, currency), [o, bill, headcount, currency]);
  const insight = outcomeInsight(caseB);

  const set = (patch: Partial<OutcomeConfig>) => s.setOutcome(projectId, patch);

  // ── Resource Mix Optimizer (resource shuffle -> net efficiency) ──
  const mix = o.mix ?? { fresherVelocityPct: 0.65, fresherReworkPct: 0.1, swaps: {} };
  const mixResult = useMemo(
    () => computeMix({ resources: billing.resources, swaps: mix.swaps, fresherVelocityPct: mix.fresherVelocityPct, fresherReworkPct: mix.fresherReworkPct, currency }),
    [billing.resources, mix, currency],
  );
  const setMix = (patch: Partial<typeof mix>) => set({ mix: { ...mix, ...patch } });
  const setSwap = (rid: string, patch: Partial<{ count: number; fresherCostRate: number }>) => {
    const swaps = { ...mix.swaps };
    const next = { ...(swaps[rid] ?? { count: 0, fresherCostRate: 0 }), ...patch };
    if (next.count <= 0) delete swaps[rid]; else swaps[rid] = next;
    setMix({ swaps });
  };
  // max client discount that still keeps the win-win (funded by the efficiency)
  const maxDiscount = bill.monthlyRevenue > 0 ? (bill.monthlyExpenses - bill.monthlyExpenses / (1 + o.efficiencyGainPct)) / bill.monthlyRevenue : 0;

  // charts
  const billBars = [
    { name: caseA.label, 'TNM (client pays)': bill.monthlyRevenue, 'Outcome (client pays)': caseA.monthlyBill },
    { name: caseB.label, 'TNM (client pays)': bill.monthlyRevenue, 'Outcome (client pays)': caseB.monthlyBill },
  ];
  const marginBars = [
    { name: caseA.label, 'TNM margin %': Math.round(caseA.tnmMarginPct * 100), 'Outcome margin %': Math.round(caseA.outcomeMarginPct * 100) },
    { name: caseB.label, 'TNM margin %': Math.round(caseB.tnmMarginPct * 100), 'Outcome margin %': Math.round(caseB.outcomeMarginPct * 100) },
  ];
  const perSpBars = [
    { name: caseA.label, 'TNM cost/SP (client)': caseA.clientTnmCostPerSp, 'Outcome price/SP': caseA.pricePerSp },
    { name: caseB.label, 'TNM cost/SP (client)': caseB.clientTnmCostPerSp, 'Outcome price/SP': caseB.pricePerSp },
  ];

  const opusExtraYr = caseB.opusYearlyProfitOutcome - caseB.opusYearlyProfitTnm;

  // fixed-rate sensitivity (one negotiated rate applied to both cases)
  const fixedRate = caseB.pricePerSp;
  const fixed = [caseA, caseB].map((c) => ({ ...c, fixedBill: Math.round(fixedRate * c.monthlySp), fixedVsTnm: Math.round(fixedRate * c.monthlySp - bill.monthlyRevenue) }));

  if (!project) return <PageHeader title="Outcome Simulator" subtitle="Add a project in Configuration first" />;

  const tableRows = [
    { metric: 'Per-person capacity / sprint', a: `${o.caseACapacity} SP`, b: `${o.caseBCapacity} SP` },
    { metric: 'Gross team velocity / sprint', a: `${caseA.grossVelocity} SP`, b: `${caseB.grossVelocity} SP` },
    { metric: `Less ${Math.round(o.reservePct * 100)}% reserve → effective`, a: `${caseA.effectiveVelocity} SP`, b: `${caseB.effectiveVelocity} SP` },
    { metric: `Deliverable SP / month (×${o.sprintsPerMonth})`, a: `${caseA.monthlySp} SP`, b: `${caseB.monthlySp} SP` },
    { metric: `Meets ${o.minInvoiceSp}-SP min invoice?`, aNode: caseA.meetsMin ? <Tag color="green">Yes</Tag> : <Tag color="red">No (−{o.minInvoiceSp - caseA.monthlySp})</Tag>, bNode: caseB.meetsMin ? <Tag color="green">Yes</Tag> : <Tag color="red">No (−{o.minInvoiceSp - caseB.monthlySp})</Tag> },
    { metric: 'Break-even price / SP (TNM-equiv)', a: fmtMoney(caseA.breakEvenPerSp, currency), b: fmtMoney(caseB.breakEvenPerSp, currency) },
    { metric: `Recommended price / SP (−${Math.round(o.clientDiscountPct * 100)}% for client)`, aNode: <Text strong>{fmtMoney(caseA.pricePerSp, currency)}</Text>, bNode: <Text strong>{fmtMoney(caseB.pricePerSp, currency)}</Text> },
    { metric: 'Monthly outcome bill', a: fmtMoney(caseA.monthlyBill, currency), b: fmtMoney(caseB.monthlyBill, currency) },
    { metric: 'Yearly outcome bill', a: fmtMoney(caseA.yearlyBill, currency, { compact: true }), b: fmtMoney(caseB.yearlyBill, currency, { compact: true }) },
    { metric: 'Opus margin — TNM', a: fmtPct(caseA.tnmMarginPct), b: fmtPct(caseB.tnmMarginPct) },
    { metric: 'Opus margin — Outcome', aNode: <Text strong style={{ color: '#1a7f37' }}>{fmtPct(caseA.outcomeMarginPct)}</Text>, bNode: <Text strong style={{ color: '#1a7f37' }}>{fmtPct(caseB.outcomeMarginPct)}</Text> },
    { metric: 'Client saving / year', aNode: <Text style={{ color: '#1a7f37' }}>{fmtMoney(caseA.clientYearlySaving, currency, { compact: true })}</Text>, bNode: <Text style={{ color: '#1a7f37' }}>{fmtMoney(caseB.clientYearlySaving, currency, { compact: true })}</Text> },
  ];

  return (
    <>
      <PageHeader title="Outcome-Based Cost Simulation" subtitle="Two capacity cases compared · margin, charts & the client win-win (team inherited from Billing)"
        extra={<Space>
          <Select value={clientId} onChange={setClientId} options={s.clients.map((c) => ({ value: c.id, label: c.name }))} style={{ width: 150 }} />
          <Select value={projectId} onChange={setProjectId} options={clientProjects.map((p) => ({ value: p.id, label: p.name }))} style={{ width: 190 }} />
          {sow && <Tag color={MODEL_COLOR[sow.model]}>{sow.model}</Tag>}
        </Space>} />

      {bill.resources.length === 0 && <Alert style={{ marginBottom: 16 }} type="warning" showIcon message="No team defined" description="Add resources in the Billing Simulator for this project — they are inherited here." />}

      <Row gutter={[16, 16]}>
        {/* Customisation levers */}
        <Col xs={24} lg={7}>
          <Card size="small" title="Customize the simulation">
            <Form layout="vertical" size="small">
              <Row gutter={10}>
                <Col span={12}><Form.Item label="Case 1 — SP/person"><InputNumber min={1} max={20} value={o.caseACapacity} onChange={(v) => set({ caseACapacity: v ?? 7 })} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item label="Case 2 — SP/person"><InputNumber min={1} max={20} value={o.caseBCapacity} onChange={(v) => set({ caseBCapacity: v ?? 8 })} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item label={`Capacity reserve: ${Math.round(o.reservePct * 100)}%`} tooltip="Time held back for meetings, grooming and issues — not available for delivery. Trimming it (e.g. 20% → 15%) lifts output per person.">
                <Slider min={0} max={40} value={Math.round(o.reservePct * 100)} onChange={(v) => set({ reservePct: v / 100 })} />
              </Form.Item>
              <Row gutter={10}>
                <Col span={12}><Form.Item label="Sprints / month"><InputNumber min={1} max={3} value={o.sprintsPerMonth} onChange={(v) => set({ sprintsPerMonth: v ?? 2 })} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={12}><Form.Item label="Min invoice SP" tooltip="Minimum accepted SP to raise an invoice — not mandatory; lower it if a case delivers fewer."><InputNumber min={0} value={o.minInvoiceSp} onChange={(v) => set({ minInvoiceSp: v ?? 0 })} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Form.Item style={{ marginBottom: 6 }} label={`Outcome efficiency gain: ${Math.round(o.efficiencyGainPct * 100)}%`} tooltip="How much CHEAPER you can deliver the same scope under Outcome — mostly from a leaner resource mix + trimmed overhead. Don't guess it: use the Resource Mix Optimizer below to ground it.">
                <Slider min={0} max={40} value={Math.round(o.efficiencyGainPct * 100)} onChange={(v) => set({ efficiencyGainPct: v / 100 })} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 2 }} label={`Client discount vs TNM: ${Math.round(o.clientDiscountPct * 100)}%`} tooltip="The slice of your efficiency you give back to the client as a lower price. Keep it BELOW the efficiency or it stops being a win-win.">
                <Slider min={0} max={25} value={Math.round(o.clientDiscountPct * 100)} onChange={(v) => set({ clientDiscountPct: v / 100 })} />
              </Form.Item>
              <Text type={o.clientDiscountPct <= maxDiscount + 0.0001 ? 'success' : 'danger'} style={{ fontSize: 11 }}>
                {o.clientDiscountPct <= maxDiscount + 0.0001 ? <CheckCircleOutlined /> : <WarningOutlined />} Win-win up to ~{fmtPct(maxDiscount)} discount at {Math.round(o.efficiencyGainPct * 100)}% efficiency
              </Text>
            </Form>
            {!caseA.meetsMin && (
              <Alert type="info" showIcon message={`Case 1 delivers ${caseA.monthlySp} SP — below the ${o.minInvoiceSp}-SP minimum. Lower the minimum to ≤ ${caseA.monthlySp} (e.g. 100) to invoice.`} style={{ fontSize: 12 }} />
            )}
          </Card>

          <Card size="small" title="Inherited team (TNM)" style={{ marginTop: 16 }}>
            <Row gutter={8}>
              <Col span={12}><Statistic title="Headcount" value={headcount} /></Col>
              <Col span={12}><Statistic title="Hrs / SP" value={o.hoursPerStoryPoint} /></Col>
              <Col span={12}><Statistic title="TNM bill / mo" value={fmtMoney(bill.monthlyRevenue, currency, { compact: true })} /></Col>
              <Col span={12}><Statistic title="TNM margin" value={fmtPct(bill.marginPct)} /></Col>
            </Row>
          </Card>
        </Col>

        {/* Comparison + win-win */}
        <Col xs={24} lg={17}>
          {/* The headline answer */}
          <Card size="small" title={<Space><SmileOutlined style={{ color: '#1a7f37' }} /> Why the client switches — the win-win <AiBadge text="AI analytics" /></Space>} style={{ marginBottom: 16 }}>
            <Alert
              type={insight.winWin ? 'success' : 'warning'}
              showIcon
              icon={insight.winWin ? <CheckCircleOutlined /> : <WarningOutlined />}
              message={insight.headline}
              style={{ marginBottom: 12 }}
            />
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}><GapHeadline label="Client saves (per year)" value={caseB.clientYearlySaving} currency={currency} sub={`${fmtMoney(caseB.clientMonthlySaving, currency, { compact: true })}/mo · pays per accepted point`} /></Col>
              <Col xs={24} md={16}>
                <List size="small" dataSource={insight.points} renderItem={(p) => <List.Item style={{ paddingBlock: 4, fontSize: 13 }}><RiseOutlined style={{ color: '#1f6feb', marginRight: 6 }} />{p}</List.Item>} />
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><KpiCard title="Opus margin — TNM" value={caseB.tnmMarginPct * 100} precision={1} suffix="%" /></Col>
            <Col xs={12} md={6}><KpiCard title="Opus margin — Outcome" value={caseB.outcomeMarginPct * 100} precision={1} suffix="%" accent="success" trend={caseB.outcomeMarginPct - caseB.tnmMarginPct} /></Col>
            <Col xs={12} md={6}><KpiCard title="Opus extra profit / yr" value={opusExtraYr} money currency={currency} accent="success" /></Col>
            <Col xs={12} md={6}><KpiCard title="Client saving / yr" value={caseB.clientYearlySaving} money currency={currency} accent="success" /></Col>
          </Row>
        </Col>
      </Row>

      {/* Resource Mix Optimizer — the resource-shuffle simulation */}
      <Card size="small" style={{ marginTop: 16 }} title={<Space><ThunderboltOutlined style={{ color: '#bf8700' }} /> Resource Mix Optimizer <AiBadge text="grounds the efficiency %" /></Space>}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={15}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Under Outcome the price is fixed per point, so swapping higher-cost seniors for freshers lowers cost. Freshers are cheaper but slower and need more rework — this shows the <b>net</b> efficiency after that drag, ready to apply to the lever above.
            </Text>
            <Table size="small" pagination={false} rowKey="id" style={{ marginTop: 8 }}
              dataSource={billing.resources}
              columns={[
                { title: 'Role', dataIndex: 'role', render: (v: string, r) => <span>{v} <Text type="secondary" style={{ fontSize: 11 }}>({r.experience})</Text></span> },
                { title: 'Count', dataIndex: 'count', align: 'right' },
                { title: 'Cost/hr', key: 'cost', align: 'right', render: (_: unknown, r) => fmtMoney(convert(r.costRate, r.currency, currency), currency) },
                { title: 'Swap → fresher', key: 'swap', align: 'center', render: (_: unknown, r) => <InputNumber size="small" min={0} max={r.count} value={mix.swaps[r.id]?.count ?? 0} onChange={(v) => setSwap(r.id, { count: v ?? 0 })} style={{ width: 64 }} /> },
                { title: 'Fresher cost/hr', key: 'fcost', align: 'right', render: (_: unknown, r) => { const def = Math.round(convert(r.costRate, r.currency, currency) * 0.5); const swp = mix.swaps[r.id]; return <InputNumber size="small" min={0} value={swp?.fresherCostRate ?? def} disabled={!swp?.count} onChange={(v) => setSwap(r.id, { fresherCostRate: v ?? def })} style={{ width: 84 }} />; } },
              ]}
              locale={{ emptyText: 'Add resources in the Billing Simulator' }}
            />
          </Col>
          <Col xs={24} lg={9}>
            <Form layout="vertical" size="small">
              <Form.Item style={{ marginBottom: 8 }} label={`Fresher velocity: ${Math.round(mix.fresherVelocityPct * 100)}% of a regular member`} tooltip="A fresher delivers this fraction of a normal member's story points.">
                <Slider min={30} max={100} value={Math.round(mix.fresherVelocityPct * 100)} onChange={(v) => setMix({ fresherVelocityPct: v / 100 })} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 8 }} label={`Extra rework from freshers: ${Math.round(mix.fresherReworkPct * 100)}%`} tooltip="Fresher output needs this much more rework — it eats into the saving.">
                <Slider min={0} max={40} value={Math.round(mix.fresherReworkPct * 100)} onChange={(v) => setMix({ fresherReworkPct: v / 100 })} />
              </Form.Item>
            </Form>
            <Row gutter={8}>
              <Col span={12}><Statistic title="Blended cost" value={fmtPct(mixResult.costChangePct)} valueStyle={{ color: mixResult.costChangePct < 0 ? '#1a7f37' : '#6e7781', fontSize: 18 }} /></Col>
              <Col span={12}><Statistic title="Team velocity" value={fmtPct(mixResult.velocityChangePct)} valueStyle={{ color: mixResult.velocityChangePct < -0.0001 ? '#cf222e' : '#1a7f37', fontSize: 18 }} /></Col>
            </Row>
            <Card size="small" style={{ marginTop: 8, background: '#e6f4ea', borderColor: '#1a7f37' }} styles={{ body: { padding: 10 } }}>
              <Statistic title="Net efficiency from this mix" value={Math.max(0, mixResult.netEfficiencyPct) * 100} precision={1} suffix="%" valueStyle={{ color: '#1a7f37', fontSize: 22 }} />
            </Card>
            <Button type="primary" block style={{ marginTop: 8 }} disabled={mixResult.swappedCount === 0}
              onClick={() => { set({ efficiencyGainPct: Math.max(0, round(mixResult.netEfficiencyPct, 3)) }); message.success(`Applied ${fmtPct(Math.max(0, mixResult.netEfficiencyPct))} to the efficiency lever`); }}>
              Apply {fmtPct(Math.max(0, mixResult.netEfficiencyPct))} to the efficiency lever
            </Button>
          </Col>
        </Row>
        {mixResult.swappedCount > 0 && mixResult.velocityChangePct < -0.001 && (
          <Alert style={{ marginTop: 10 }} type="warning" showIcon
            message={`This mix lowers team velocity ~${fmtPct(Math.abs(mixResult.velocityChangePct))} — you'll deliver fewer points. Keep enough seniors (or add headcount) to still hit the committed ${o.minInvoiceSp} SP/month.`} />
        )}
      </Card>

      {/* Comparison table */}
      <Card size="small" title="Case 1 vs Case 2 — step-by-step comparison" style={{ marginTop: 16 }}>
        <Table size="small" pagination={false} rowKey="metric"
          dataSource={tableRows}
          columns={[
            { title: 'Metric', dataIndex: 'metric', width: 320 },
            { title: caseA.label, key: 'a', align: 'right', render: (_: unknown, r: any) => r.aNode ?? r.a },
            { title: caseB.label, key: 'b', align: 'right', render: (_: unknown, r: any) => r.bNode ?? r.b },
          ]}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>Note: because the outcome price is anchored to the team's TNM run-rate, the monthly <b>total</b> is the same in both cases — velocity only changes the <b>rate per point</b> and whether the minimum-invoice is met. The per-point rate is higher for the slower (Case 1) team.</Text>
      </Card>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}><Card size="small" title="Client pays — TNM vs Outcome"><ComparisonBar data={billBars} xKey="name" series={[{ key: 'TNM (client pays)', name: 'TNM', color: '#6e7781' }, { key: 'Outcome (client pays)', name: 'Outcome', color: '#1a7f37' }]} height={240} /></Card></Col>
        <Col xs={24} lg={8}><Card size="small" title="Opus margin % — TNM vs Outcome"><ComparisonBar data={marginBars} xKey="name" series={[{ key: 'TNM margin %', name: 'TNM', color: '#6e7781' }, { key: 'Outcome margin %', name: 'Outcome', color: '#1f6feb' }]} height={240} /></Card></Col>
        <Col xs={24} lg={8}><Card size="small" title="Price per story point"><ComparisonBar data={perSpBars} xKey="name" series={[{ key: 'TNM cost/SP (client)', name: 'TNM cost/SP', color: '#6e7781' }, { key: 'Outcome price/SP', name: 'Outcome /SP', color: '#1a7f37' }]} height={240} /></Card></Col>
      </Row>

      {/* Fixed-rate sensitivity + client benefits */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title={`If you instead lock ONE rate per SP (${fmtMoney(fixedRate, currency)})`}>
            <Table size="small" pagination={false} rowKey="label" dataSource={fixed}
              columns={[
                { title: 'Case', dataIndex: 'label' },
                { title: 'SP/mo', dataIndex: 'monthlySp', align: 'right' },
                { title: 'Monthly bill', key: 'fb', align: 'right', render: (_: unknown, r) => fmtMoney(r.fixedBill, currency, { compact: true }) },
                { title: 'vs TNM', key: 'v', align: 'right', render: (_: unknown, r) => <Text type={r.fixedVsTnm >= 0 ? 'success' : 'danger'}>{r.fixedVsTnm >= 0 ? '+' : ''}{fmtMoney(r.fixedVsTnm, currency, { compact: true })}</Text> },
              ]} />
            <Text type="secondary" style={{ fontSize: 12 }}>With a <b>fixed</b> per-SP rate the totals differ by velocity — a slower team can fall below TNM (delivery risk), a faster team beats it. This is the risk outcome contracts price for.</Text>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title={<Space><BulbOutlined style={{ color: '#bf8700' }} /> What the client actually gains (beyond price)</Space>}>
            <List size="small" dataSource={insight.clientBenefits} renderItem={(c) => <List.Item style={{ paddingBlock: 5, fontSize: 13 }}>✓ {c}</List.Item>} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
