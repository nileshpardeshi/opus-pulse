import { useState, useMemo } from 'react';
import { Row, Col, Card, Select, Form, Input, InputNumber, Button, Table, Tag, Statistic, Typography, Space, App } from 'antd';
import { useStore } from '../store';
import { PageHeader, useCanSee } from '../components/common';
import { projectEconomics } from '../engines/margin';
import { priceChangeRequest, scopeVolatilityPct } from '../engines/changeRequest';
import { resolveBillRate } from '../engines/tnm';
import { money, fmtMoney, fmtPct, uid, convert } from '../utils';
import type { CRType, Country } from '../types';

const { Text } = Typography;
const STATUS_COLOR: Record<string, string> = { draft: 'default', submitted: 'processing', approved: 'success', rejected: 'error', 'client-accepted': 'green' };

export default function ChangeRequests() {
  const { projects, sows, teams, features, allocations, employees, billRates, changeRequests, addChangeRequest, config } = useStore();
  const { message } = App.useApp();
  const canMargin = useCanSee('margin');
  const [projectId, setProjectId] = useState('prj_token');
  const project = projects.find((p) => p.id === projectId)!;
  const sow = sows.find((s) => s.id === project.sowId)!;
  const team = teams.find((t) => t.id === project.teamId)!;
  const projFeatures = features.filter((f) => f.projectId === projectId);

  const [desc, setDesc] = useState('');
  const [type, setType] = useState<CRType>('add');
  const [featureId, setFeatureId] = useState(projFeatures[0]?.id);
  const [deltaSp, setDeltaSp] = useState(40);

  const econ = projectEconomics(project, allocations, employees);
  const teamSize = employees.filter((e) => e.teamId === team.id && e.status === 'active').length || 1;
  const blendedHourlyCost = econ.costMonthlyUsd / (teamSize * 160);
  const sampleEmp = employees.find((e) => e.teamId === team.id);
  const rate = sampleEmp ? resolveBillRate(billRates, { clientId: project.clientId, role: sampleEmp.role, location: sampleEmp.country as Country, tenureBand: sampleEmp.tenureBand }) : undefined;
  const tnmRate = rate ? convert(rate.rate, rate.currency, config.baseCurrency) : 50;

  const signedSp = type === 'descope' ? -Math.abs(deltaSp) : deltaSp;
  const cr = useMemo(() => priceChangeRequest({ deltaStoryPoints: signedSp, spToHours: team.spToHours, blendedHourlyCost, model: sow.modelType, tnmRatePerHour: tnmRate, minMarginPct: sow.minMarginPct, targetMarginPct: 0.33 }), [signedSp, team.spToHours, blendedHourlyCost, sow.modelType, tnmRate, sow.minMarginPct]);

  const register = changeRequests.filter((c) => c.projectId === projectId);
  const totalCrSp = register.reduce((s, c) => s + Math.abs(c.deltaStoryPoints), 0);
  const baseSp = projFeatures.reduce((s, f) => s + f.sizeStoryPoints, 0);
  const volatility = scopeVolatilityPct(baseSp, totalCrSp);

  const submit = () => {
    if (!desc.trim()) { message.warning('Add a description'); return; }
    addChangeRequest({
      id: uid('cr'), projectId, featureId: featureId ?? projFeatures[0].id, description: desc.trim(), type,
      deltaStoryPoints: signedSp, deltaCost: money(cr.deltaCost, config.baseCurrency), deltaPrice: money(cr.deltaPrice, config.baseCurrency),
      marginImpactPct: cr.marginPct, revisedTimelineSprints: Math.ceil(Math.abs(signedSp) / 80), status: 'submitted', raisedOn: new Date().toISOString().slice(0, 10),
    });
    setDesc('');
    message.success('Change request submitted for approval');
  };

  return (
    <>
      <PageHeader title="Change requests" subtitle="Re-size, re-price (floor-clamped), and route scope changes for approval (Module K)" extra={<Select value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} style={{ width: 240 }} />} />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card size="small" title="Raise a change request">
            <Form layout="vertical" size="small">
              <Form.Item label="Description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Add multi-asset token support" /></Form.Item>
              <Form.Item label="Type"><Select value={type} onChange={setType} options={[{ value: 'add', label: 'Add scope' }, { value: 'modify', label: 'Modify' }, { value: 'descope', label: 'Descope' }]} /></Form.Item>
              <Form.Item label="Feature"><Select value={featureId} onChange={setFeatureId} options={projFeatures.map((f) => ({ value: f.id, label: f.name }))} /></Form.Item>
              <Form.Item label={`${type === 'descope' ? 'Reduce' : 'Add'} story points`}><InputNumber min={1} max={300} value={deltaSp} onChange={(v) => setDeltaSp(v ?? 0)} style={{ width: '100%' }} /></Form.Item>
            </Form>
            {canMargin && (
              <Space direction="vertical" style={{ width: '100%' }} size={2}>
                <Row gutter={8}>
                  <Col span={8}><Statistic title="Δ hours" value={cr.deltaHours} /></Col>
                  <Col span={8}><Statistic title="Δ cost" value={fmtMoney(cr.deltaCost, config.baseCurrency, { compact: true })} /></Col>
                  <Col span={8}><Statistic title="Δ price" value={fmtMoney(cr.deltaPrice, config.baseCurrency, { compact: true })} /></Col>
                </Row>
                <Text type="secondary" style={{ fontSize: 12 }}>Margin on CR: {fmtPct(cr.marginPct)} {cr.floorClamped && <Tag color="orange">floor-clamped</Tag>}</Text>
              </Space>
            )}
            <Button type="primary" block style={{ marginTop: 12 }} onClick={submit}>Submit for approval</Button>
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small"><Statistic title="Open CRs" value={register.filter((c) => c.status !== 'rejected').length} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title="Base scope" value={baseSp} suffix="SP" /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title="Scope volatility" value={Math.round(volatility * 100)} suffix="%" valueStyle={{ color: volatility > 0.2 ? '#cf222e' : undefined }} /></Card></Col>
          </Row>
          <Card size="small" title="CR register">
            <Table size="small" pagination={false} dataSource={register.map((c) => ({ key: c.id, ...c }))} columns={[
              { title: 'Description', dataIndex: 'description' },
              { title: 'Type', dataIndex: 'type', render: (t: string) => <Tag>{t}</Tag> },
              { title: 'Δ SP', dataIndex: 'deltaStoryPoints', align: 'right' },
              { title: 'Δ price', key: 'p', align: 'right', render: (_: unknown, r) => canMargin ? fmtMoney(r.deltaPrice.amount, r.deltaPrice.currency, { compact: true }) : '•••' },
              { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
            ]} locale={{ emptyText: 'No change requests' }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
