import { useState, useMemo } from 'react';
import { Row, Col, Card, Table, Select, Alert, Statistic, Tag, Typography, Form } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { PageHeader, useCanSee, KpiCard } from '../components/common';
import { ComparisonBar } from '../components/charts';
import { projectEconomics } from '../engines/margin';
import { computePricing } from '../engines/outcomePricing';
import { marketplaceImpact, realizedVsEstimated } from '../engines/marketplace';
import { fmtMoney, fmtPct } from '../utils';

const { Text } = Typography;

export default function DeliveryMarketplace() {
  const canSee = useCanSee('marketplace');
  const { accelerators, assetApplications, features, projects, teams, allocations, employees, sows, config } = useStore();
  const [acceleratorId, setAcceleratorId] = useState(accelerators[0]?.id);
  const [featureId, setFeatureId] = useState('feat_token');

  const accelerator = accelerators.find((a) => a.id === acceleratorId)!;
  const feature = features.find((f) => f.id === featureId)!;
  const project = projects.find((p) => p.id === feature.projectId)!;
  const sow = sows.find((s) => s.id === project.sowId)!;
  const team = teams.find((t) => t.id === project.teamId)!;

  const impact = useMemo(() => {
    const econ = projectEconomics(project, allocations, employees);
    const totalHours = feature.sizeStoryPoints * team.spToHours;
    const teamSize = employees.filter((e) => e.teamId === team.id && e.status === 'active').length || 1;
    const blendedHourlyCost = econ.costMonthlyUsd / (teamSize * 160);
    const sprints = Math.max(1, Math.ceil(feature.sizeStoryPoints / 80));
    const pricing = computePricing({ storyPoints: feature.sizeStoryPoints, monthlyCostUsd: econ.costMonthlyUsd, monthlyBillingUsd: econ.revenueMonthlyUsd, durationMonths: sprints / 2, minMarginPct: sow.minMarginPct, targetMarginPct: 0.33, riskBufferPct: feature.riskBufferPct, milestones: sprints });
    const tnmRate = econ.revenueMonthlyUsd / (teamSize * 160); // bill run-rate per hour equivalent
    return marketplaceImpact(accelerator, totalHours, blendedHourlyCost, pricing.recommendedPrice, tnmRate);
  }, [accelerator, feature, project, team, allocations, employees, sow]);

  if (!canSee) {
    return (
      <>
        <PageHeader title="Delivery marketplace" />
        <Alert type="error" showIcon icon={<LockOutlined />} message="Internal-only module" description="Delivery Marketplace savings are internal margin intelligence (FR-J5). Restricted to commercial, finance, and delivery-leadership roles. Switch to CDO, Finance, or Bid." />
      </>
    );
  }

  const retentionBars = [
    { model: 'Outcome', 'Before accelerator': Math.round(impact.outcomeMarginBefore * 100), 'After accelerator': Math.round(impact.outcomeMarginAfter * 100) },
  ];
  const revenueBars = [
    { model: 'Outcome (price fixed)', Before: impact.outcomePrice, After: impact.outcomePrice },
    { model: 'TNM (hours billed)', Before: impact.tnmRevenueBefore, After: impact.tnmRevenueAfter },
  ];
  const apps = assetApplications.map((a) => ({ key: a.id, ...a, ...realizedVsEstimated(a.estEffortSaved, a.actualEffortSaved) }));

  return (
    <>
      <PageHeader title="Delivery marketplace" subtitle="Productivity-to-margin — why outcome delivery wins (Module J)" extra={<Tag icon={<LockOutlined />} color="red">Internal only — never shown to clients</Tag>} />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card size="small" title="Apply an accelerator">
            <Form layout="vertical" size="small">
              <Form.Item label="Accelerator"><Select value={acceleratorId} onChange={setAcceleratorId} options={accelerators.map((a) => ({ value: a.id, label: `${a.name} (${Math.round(a.effortSavedFactor * 100)}%)` }))} /></Form.Item>
              <Form.Item label="Feature"><Select value={featureId} onChange={setFeatureId} options={features.map((f) => ({ value: f.id, label: f.name }))} /></Form.Item>
            </Form>
            <Text type="secondary" style={{ fontSize: 12 }}>{accelerator.type} · {accelerator.techStack.join(', ')}</Text>
          </Card>
        </Col>
        <Col xs={24} lg={17}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><KpiCard title="Effort saved" value={impact.effortSavedHours} suffix=" hrs" /></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Cost before → after" value={fmtMoney(impact.baseCost, config.baseCurrency, { compact: true })} suffix={`→ ${fmtMoney(impact.adjustedCost, config.baseCurrency, { compact: true })}`} /></Card></Col>
            <Col xs={12} md={6}><KpiCard title="Outcome margin (after)" value={impact.outcomeMarginAfter * 100} precision={1} suffix="%" accent="success" /></Col>
            <Col xs={12} md={6}><KpiCard title="Margin uplift" value={(impact.outcomeMarginAfter - impact.outcomeMarginBefore) * 100} precision={1} suffix=" pts" accent="success" /></Col>
          </Row>
          <Alert style={{ marginTop: 16 }} type="success" showIcon message={`Under outcome, the price stays ${fmtMoney(impact.outcomePrice, config.baseCurrency, { compact: true })} — the full ${impact.effortSavedHours}-hr saving flows to margin (${fmtPct(impact.outcomeMarginBefore)} → ${fmtPct(impact.outcomeMarginAfter)}).`} description={`Under TNM the same saving would cut revenue from ${fmtMoney(impact.tnmRevenueBefore, config.baseCurrency, { compact: true })} to ${fmtMoney(impact.tnmRevenueAfter, config.baseCurrency, { compact: true })} — the gain would be returned to the client.`} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}><Card size="small" title="Outcome margin retention (%)"><ComparisonBar data={retentionBars} xKey="model" series={[{ key: 'Before accelerator', name: 'Before' }, { key: 'After accelerator', name: 'After' }]} height={220} /></Card></Col>
        <Col xs={24} lg={12}><Card size="small" title="Revenue impact: outcome vs TNM"><ComparisonBar data={revenueBars} xKey="model" series={[{ key: 'Before', name: 'Before' }, { key: 'After', name: 'After' }]} height={220} /></Card></Col>
      </Row>

      <Card size="small" title="Realized vs estimated savings (feedback loop, FR-J4)" style={{ marginTop: 16 }}>
        <Table size="small" pagination={false} dataSource={apps} columns={[
          { title: 'Accelerator', dataIndex: 'acceleratorId', render: (id: string) => accelerators.find((a) => a.id === id)?.name },
          { title: 'Est. saved (hrs)', dataIndex: 'estEffortSaved', align: 'right' },
          { title: 'Actual saved (hrs)', dataIndex: 'actualEffortSaved', align: 'right' },
          { title: 'Variance', dataIndex: 'variancePct', align: 'right', render: (v: number) => fmtPct(v) },
          { title: 'Honest?', dataIndex: 'honest', render: (h: boolean) => <Tag color={h ? 'green' : 'red'}>{h ? 'Within ±15%' : 'Re-calibrate'}</Tag> },
        ]} />
      </Card>
    </>
  );
}
