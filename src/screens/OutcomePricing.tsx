import { useState, useMemo } from 'react';
import { Row, Col, Card, Select, Slider, Form, Statistic, Alert, Tag, Typography, Table, InputNumber } from 'antd';
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { PageHeader, AiBadge, KpiCard, useCanSee } from '../components/common';
import { ComparisonBar } from '../components/charts';
import { projectEconomics } from '../engines/margin';
import { computePricing, priceAllModels, estimationIntegrity } from '../engines/outcomePricing';
import { spEconomics } from '../engines/spEconomics';
import { DELIVERY_MODEL_LABEL, type DeliveryModel } from '../types';
import { fmtMoney, fmtPct } from '../utils';
import { MODEL_COLORS } from '../theme';

const { Text } = Typography;

export default function OutcomePricing() {
  const { projects, allocations, employees, features, sows, config } = useStore();
  const canMargin = useCanSee('margin');
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === 'prj_token')?.id ?? projects[0]?.id);
  const project = projects.find((p) => p.id === projectId)!;
  const sow = sows.find((s) => s.id === project.sowId)!;
  const projFeatures = features.filter((f) => f.projectId === projectId);
  const [featureId, setFeatureId] = useState(projFeatures[0]?.id);
  const feature = projFeatures.find((f) => f.id === featureId) ?? projFeatures[0];

  const econ = useMemo(() => projectEconomics(project, allocations, employees), [project, allocations, employees]);

  const [sp, setSp] = useState(feature?.sizeStoryPoints ?? 240);
  const [velocity, setVelocity] = useState(80);
  const [targetMargin, setTargetMargin] = useState(33);
  const [riskBuffer, setRiskBuffer] = useState(Math.round((feature?.riskBufferPct ?? 0.15) * 100));
  const [milestones, setMilestones] = useState(3);

  const sprints = Math.max(1, Math.ceil(sp / velocity));
  const durationMonths = sprints / 2;

  const inputs = useMemo(() => ({
    storyPoints: sp,
    monthlyCostUsd: econ.costMonthlyUsd,
    monthlyBillingUsd: econ.revenueMonthlyUsd,
    durationMonths,
    minMarginPct: sow.minMarginPct,
    targetMarginPct: targetMargin / 100,
    riskBufferPct: riskBuffer / 100,
    milestones,
  }), [sp, econ, durationMonths, sow.minMarginPct, targetMargin, riskBuffer, milestones]);

  const result = useMemo(() => computePricing(inputs), [inputs]);
  const models = useMemo(() => priceAllModels(inputs), [inputs]);
  const integrity = estimationIntegrity(sp, feature?.sizeStoryPoints ?? sp);
  const spEcon = spEconomics(result.recommendedPrice, result.costToDeliver, sp);

  const modelBars = models.map((m) => ({ model: DELIVERY_MODEL_LABEL[m.model as DeliveryModel].replace(' / milestone', ''), Price: m.price, Margin: Math.round(m.marginPct * 100) }));

  if (!canMargin) {
    return (<><PageHeader title="Outcome pricing" /><Alert type="warning" showIcon message="Pricing & margin are restricted for your role" description="Switch to Bid, Finance, or CDO to use the pricing workbench." /></>);
  }

  return (
    <>
      <PageHeader title="Outcome pricing" subtitle="Cost-to-deliver, TNM floor, AI-recommended price + multi-model (Module F)" extra={<AiBadge text="Pricing AI (constrained)" />} />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card size="small" title="Levers">
            <Form layout="vertical" size="small">
              <Form.Item label="Project"><Select value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} /></Form.Item>
              <Form.Item label="Feature"><Select value={featureId} onChange={(v) => { setFeatureId(v); const f = projFeatures.find((x) => x.id === v); if (f) setSp(f.sizeStoryPoints); }} options={projFeatures.map((f) => ({ value: f.id, label: f.name }))} /></Form.Item>
              <Form.Item label={`Story points: ${sp}`}><Slider min={40} max={500} step={10} value={sp} onChange={setSp} /></Form.Item>
              <Form.Item label={`Team velocity: ${velocity} SP/sprint`}><Slider min={20} max={160} step={5} value={velocity} onChange={setVelocity} /></Form.Item>
              <Form.Item label={`Target margin: ${targetMargin}%`}><Slider min={15} max={55} value={targetMargin} onChange={setTargetMargin} /></Form.Item>
              <Form.Item label={`Risk buffer: ${riskBuffer}%`}><Slider min={0} max={30} value={riskBuffer} onChange={setRiskBuffer} /></Form.Item>
              <Form.Item label="Milestones"><InputNumber min={1} max={8} value={milestones} onChange={(v) => setMilestones(v ?? 1)} style={{ width: '100%' }} /></Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={17}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={8}><Card size="small"><Statistic title="Cost-to-deliver" value={fmtMoney(result.costToDeliver, config.baseCurrency, { compact: true })} /><Text type="secondary" style={{ fontSize: 11 }}>{sprints} sprints (~{durationMonths.toFixed(1)} mo)</Text></Card></Col>
            <Col xs={12} md={8}><Card size="small"><Statistic title="TNM run-rate (floor)" value={fmtMoney(result.tnmRunRate, config.baseCurrency, { compact: true })} /></Card></Col>
            <Col xs={12} md={8}><KpiCard title="Recommended price" value={result.recommendedPrice} money currency={config.baseCurrency} accent="success" /></Col>
            <Col xs={12} md={8}><KpiCard title="Outcome margin" value={result.marginPct * 100} precision={1} suffix="%" accent="success" /></Col>
            <Col xs={12} md={8}><Card size="small"><Statistic title="Price / SP" value={fmtMoney(spEcon.revenuePerSp, config.baseCurrency)} /></Card></Col>
            <Col xs={12} md={8}><Card size="small"><Statistic title="Price / milestone" value={fmtMoney(result.pricePerMilestone, config.baseCurrency, { compact: true })} /></Card></Col>
          </Row>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Tag icon={<CheckCircleOutlined />} color={result.floorBinding ? 'orange' : 'green'}>
              {result.floorBinding ? `Floor binding — clamped to max(floor ${fmtMoney(result.priceFloor, config.baseCurrency, { compact: true })}, TNM ${fmtMoney(result.tnmRunRate, config.baseCurrency, { compact: true })})` : `Above floor (${fmtMoney(result.priceFloor, config.baseCurrency, { compact: true })}) and TNM run-rate`}
            </Tag>
            <Tag icon={integrity.flagged ? <WarningOutlined /> : <CheckCircleOutlined />} color={integrity.flagged ? 'red' : 'green'}>{integrity.message}</Tag>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}><Card size="small" title="Multi-model pricing (FR-F8)">
          <Table size="small" pagination={false} dataSource={models.map((m) => ({ key: m.model, ...m }))} columns={[
            { title: 'Model', dataIndex: 'model', render: (m: DeliveryModel) => <Tag color={MODEL_COLORS[m]}>{DELIVERY_MODEL_LABEL[m]}</Tag> },
            { title: 'Price', dataIndex: 'price', align: 'right', render: (v: number) => fmtMoney(v, config.baseCurrency, { compact: true }) },
            { title: 'Margin', dataIndex: 'marginPct', align: 'right', render: (v: number) => fmtPct(v) },
            { title: 'Note', dataIndex: 'note', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
          ]} />
        </Card></Col>
        <Col xs={24} lg={12}><Card size="small" title="Price & margin by model"><ComparisonBar data={modelBars} xKey="model" series={[{ key: 'Price', name: 'Price' }, { key: 'Margin', name: 'Margin %' }]} /></Card></Col>
      </Row>
    </>
  );
}
