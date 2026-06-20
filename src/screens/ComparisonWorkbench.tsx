import { useState, useMemo } from 'react';
import { Row, Col, Card, Select, Slider, Form, Statistic, Tag, Typography, Button, Table, Space, message, DatePicker } from 'antd';
import { useStore } from '../store';
import { useRiskSignals } from '../selectors';
import { PageHeader, GapHeadline, useCanSee } from '../components/common';
import { ComparisonBar } from '../components/charts';
import { projectEconomics } from '../engines/margin';
import { computePricing } from '../engines/outcomePricing';
import { offshoreShift, resizeTeam, applyAutomation, nextMigrationRung, type SimBase } from '../engines/simulator';
import { DELIVERY_MODEL_LABEL, type DeliveryModel } from '../types';
import { fmtMoney, fmtPct, uid } from '../utils';
import { MODEL_COLORS } from '../theme';

const { Text } = Typography;

export default function ComparisonWorkbench() {
  const { projects, allocations, employees, features, sows, scenarios, saveScenario, deleteScenario, config } = useStore();
  const canMargin = useCanSee('margin');
  const risks = useRiskSignals();
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === 'prj_token')?.id ?? projects[0]?.id);
  const project = projects.find((p) => p.id === projectId)!;
  const sow = sows.find((s) => s.id === project.sowId)!;
  const feature = features.find((f) => f.projectId === projectId)!;
  const econ = useMemo(() => projectEconomics(project, allocations, employees), [project, allocations, employees]);
  const teamSize = employees.filter((e) => e.teamId === project.teamId && e.status === 'active').length;

  const sprints = Math.max(1, Math.ceil(feature.sizeStoryPoints / 80));
  const pricing = computePricing({ storyPoints: feature.sizeStoryPoints, monthlyCostUsd: econ.costMonthlyUsd, monthlyBillingUsd: econ.revenueMonthlyUsd, durationMonths: sprints / 2, minMarginPct: sow.minMarginPct, targetMarginPct: 0.33, riskBufferPct: feature.riskBufferPct, milestones: sprints });

  const base: SimBase = { revenue: pricing.recommendedPrice, cost: pricing.costToDeliver, timelineSprints: sprints, teamSize };
  const tnmMarginPct = pricing.tnmRunRate > 0 ? (pricing.tnmRunRate - pricing.costToDeliver) / pricing.tnmRunRate : 0;
  const outcomeMargin$ = pricing.recommendedPrice - pricing.costToDeliver;
  const tnmMargin$ = pricing.tnmRunRate - pricing.costToDeliver;
  const gap = outcomeMargin$ - tnmMargin$;

  // scenario levers
  const [offshore, setOffshore] = useState(0);
  const [automation, setAutomation] = useState(0);
  const [newTeam, setNewTeam] = useState(teamSize);

  const sim = useMemo(() => {
    let r = { ...base };
    if (offshore > 0) r = offshoreShift(r, offshore / 100);
    if (newTeam !== teamSize) r = resizeTeam(r, newTeam, 8, feature.sizeStoryPoints);
    if (automation > 0) r = applyAutomation(r, automation / 100);
    return { ...r, marginPct: r.revenue > 0 ? (r.revenue - r.cost) / r.revenue : 0 } as SimBase & { marginPct: number; riskFlag?: string };
  }, [base, offshore, automation, newTeam, teamSize, feature.sizeStoryPoints]);

  const conv = risks.find((x) => x.projectId === projectId)?.conversionScore ?? 50;
  const nextRung = nextMigrationRung(sow.modelType, conv);
  const [targetDate, setTargetDate] = useState<string>('2026-12-31');

  const bars = [
    { model: 'TNM', Revenue: pricing.tnmRunRate, Cost: pricing.costToDeliver },
    { model: 'Outcome', Revenue: pricing.recommendedPrice, Cost: pricing.costToDeliver },
    { model: 'Simulated', Revenue: Math.round(sim.revenue), Cost: Math.round(sim.cost) },
  ];

  const doSave = () => {
    saveScenario({ id: uid('scn'), projectId, name: `${project.name} — ${new Date().toLocaleTimeString()}`, assumptions: { featureId: feature.id, resourceCount: newTeam, offshoreSharePct: offshore, automationGainPct: automation, targetMarginPct: 33, model: 'outcome' }, result: { revenue: Math.round(sim.revenue), cost: Math.round(sim.cost), marginPct: Math.round(sim.marginPct * 100) }, createdAt: new Date().toISOString() });
    message.success('Scenario saved');
  };

  if (!canMargin) return (<><PageHeader title="Comparison workbench" /><Card><Text type="warning">Margin comparison is restricted for your role.</Text></Card></>);

  const projScenarios = scenarios.filter((s) => s.projectId === projectId);

  return (
    <>
      <PageHeader title="Comparison workbench" subtitle="TNM vs Outcome, what-if simulation, migration planning (Module G)" extra={<Select value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} style={{ width: 240 }} />} />
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><GapHeadline label="TNM → Outcome margin gap (this feature)" value={gap} currency={config.baseCurrency} sub={`Outcome ${fmtPct(pricing.marginPct)} vs TNM ${fmtPct(tnmMarginPct)}`} /></Col>
        <Col xs={24} md={16}><Card size="small" title="Revenue vs cost by model"><ComparisonBar data={bars} xKey="model" series={[{ key: 'Revenue', name: 'Revenue', color: '#1a7f37' }, { key: 'Cost', name: 'Cost', color: '#cf222e' }]} height={240} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={10}><Card size="small" title="What-if simulator">
          <Form layout="vertical" size="small">
            <Form.Item label={`Offshore shift: ${offshore}%`}><Slider min={0} max={80} value={offshore} onChange={setOffshore} /></Form.Item>
            <Form.Item label={`Team size: ${newTeam} (was ${teamSize})`}><Slider min={Math.max(2, teamSize - 4)} max={teamSize + 6} value={newTeam} onChange={setNewTeam} /></Form.Item>
            <Form.Item label={`Automation / GenAI gain: ${automation}%`}><Slider min={0} max={40} value={automation} onChange={setAutomation} /></Form.Item>
          </Form>
          <Row gutter={8}>
            <Col span={8}><Statistic title="Sim revenue" value={fmtMoney(sim.revenue, config.baseCurrency, { compact: true })} /></Col>
            <Col span={8}><Statistic title="Sim cost" value={fmtMoney(sim.cost, config.baseCurrency, { compact: true })} /></Col>
            <Col span={8}><Statistic title="Sim margin" value={fmtPct(sim.marginPct)} valueStyle={{ color: '#1a7f37' }} /></Col>
          </Row>
          {sim.riskFlag && <Tag color="orange" style={{ marginTop: 8 }}>{sim.riskFlag}</Tag>}
          <div style={{ marginTop: 12 }}><Button type="primary" onClick={doSave}>Save scenario</Button></div>
        </Card></Col>
        <Col xs={24} lg={14}>
          <Card size="small" title="Portfolio migration planner (FR-G5)" style={{ marginBottom: 16 }}>
            <Space size={16} wrap>
              <div><Text type="secondary">Current model</Text><br /><Tag color={MODEL_COLORS[sow.modelType]}>{DELIVERY_MODEL_LABEL[sow.modelType]}</Tag></div>
              <div style={{ fontSize: 20 }}>→</div>
              <div><Text type="secondary">Recommended next rung (conv. {conv}/100)</Text><br /><Tag color={MODEL_COLORS[nextRung as DeliveryModel]}>{DELIVERY_MODEL_LABEL[nextRung as DeliveryModel]}</Tag></div>
              <div><Text type="secondary">Target date</Text><br /><DatePicker value={undefined} onChange={(_, ds) => setTargetDate(ds as string)} placeholder={targetDate} /></div>
            </Space>
          </Card>
          <Card size="small" title={`Saved scenarios (${projScenarios.length})`}>
            <Table size="small" pagination={false} dataSource={projScenarios.map((s) => ({ key: s.id, ...s }))} columns={[
              { title: 'Name', dataIndex: 'name', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
              { title: 'Revenue', key: 'rev', render: (_: unknown, r) => fmtMoney(r.result.revenue, config.baseCurrency, { compact: true }) },
              { title: 'Margin', key: 'm', render: (_: unknown, r) => `${r.result.marginPct}%` },
              { title: '', key: 'd', render: (_: unknown, r) => <Button size="small" danger onClick={() => deleteScenario(r.id)}>Delete</Button> },
            ]} locale={{ emptyText: 'No saved scenarios yet' }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
