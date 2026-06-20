import { useState, useMemo } from 'react';
import { Row, Col, Card, Select, Slider, Form, Statistic, Alert, Typography, Table } from 'antd';
import { useStore } from '../store';
import { PageHeader, KpiCard, useCanSee } from '../components/common';
import { TrendChart, MarginBridge } from '../components/charts';
import { projectEconomics, projectMarginCurve, monthsToFloor, costBreakdownUsd } from '../engines/margin';
import { COST_COMPONENT_LABEL, type CostComponent } from '../types';
import { fmtPct, fmtMoney } from '../utils';

const { Text } = Typography;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MarginDetail() {
  const { projects, allocations, employees, sows, config } = useStore();
  const canMargin = useCanSee('margin');
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === 'prj_token')?.id ?? projects[0]?.id);
  const project = projects.find((p) => p.id === projectId)!;
  const sow = sows.find((s) => s.id === project.sowId)!;

  const [hikePct, setHikePct] = useState(Math.round(project.appraisalHikePct * 100));
  const [cycleMonth, setCycleMonth] = useState(6);
  const [attritionDelta, setAttritionDelta] = useState(0);

  const econ = useMemo(() => projectEconomics(project, allocations, employees), [project, allocations, employees]);
  const adjEcon = { ...econ, costMonthlyUsd: econ.costMonthlyUsd * (1 + attritionDelta / 100) };
  const curve = useMemo(() => projectMarginCurve(adjEcon, 12, hikePct / 100, cycleMonth), [adjEcon, hikePct, cycleMonth]);
  const mToFloor = monthsToFloor(curve, sow.marginFloorPct);

  const trend = curve.map((p) => ({ month: MONTHS[p.month], 'Margin %': Math.round(p.marginPct * 1000) / 10 }));

  const teamEmps = employees.filter((e) => e.teamId === project.teamId && e.status !== 'left');
  const breakdown = useMemo(() => {
    const agg: Record<string, number> = {};
    teamEmps.forEach((e) => costBreakdownUsd(e).forEach((c) => { agg[c.component] = (agg[c.component] ?? 0) + c.usd / 12; }));
    return Object.entries(agg).map(([k, v]) => ({ key: k, component: COST_COMPONENT_LABEL[k as CostComponent], usd: Math.round(v) })).sort((a, b) => b.usd - a.usd);
  }, [teamEmps]);

  const bridge = [
    { name: 'Revenue', base: 0, delta: Math.round(adjEcon.revenueMonthlyUsd), fill: '#1a7f37' },
    { name: 'Loaded cost', base: Math.round(adjEcon.revenueMonthlyUsd - adjEcon.costMonthlyUsd), delta: Math.round(adjEcon.costMonthlyUsd), fill: '#cf222e' },
    { name: 'Margin', base: 0, delta: Math.round(adjEcon.profitMonthlyUsd), fill: '#1f6feb' },
  ];

  if (!canMargin) {
    return (<><PageHeader title="Margin detail" /><Alert type="warning" showIcon message="Margin data is restricted for your role" description="Switch to Finance, CDO, Account, or Bid to view loaded cost and margin." /></>);
  }

  const endMargin = curve[curve.length - 1].marginPct;
  return (
    <>
      <PageHeader title="Margin detail" subtitle="Loaded margin, appraisal/attrition levers, months-to-floor (Module C)" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={6}>
          <Card size="small" title="Levers">
            <Form layout="vertical" size="small">
              <Form.Item label="Project"><Select value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} /></Form.Item>
              <Form.Item label={`Appraisal hike: ${hikePct}%`}><Slider min={0} max={15} value={hikePct} onChange={setHikePct} /></Form.Item>
              <Form.Item label={`Appraisal cycle month: ${MONTHS[cycleMonth]}`}><Slider min={0} max={11} value={cycleMonth} onChange={setCycleMonth} /></Form.Item>
              <Form.Item label={`Attrition/backfill cost uplift: ${attritionDelta}%`}><Slider min={0} max={25} value={attritionDelta} onChange={setAttritionDelta} /></Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={18}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><KpiCard title="Current margin" value={econ.marginPct * 100} precision={1} suffix="%" accent={econ.marginPct < sow.marginFloorPct ? 'danger' : 'success'} /></Col>
            <Col xs={12} md={6}><KpiCard title="Year-end margin" value={endMargin * 100} precision={1} suffix="%" accent={endMargin < sow.marginFloorPct ? 'danger' : 'warning'} /></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Margin floor" value={sow.marginFloorPct * 100} precision={0} suffix="%" /></Card></Col>
            <Col xs={12} md={6}><KpiCard title="Months to floor" value={mToFloor ?? 0} suffix={mToFloor === null ? ' (none)' : ` (${MONTHS[mToFloor]})`} accent={mToFloor !== null && mToFloor < 6 ? 'danger' : undefined} /></Col>
          </Row>
          {mToFloor !== null && (
            <Alert style={{ marginTop: 16 }} type="error" showIcon message={`Projected to breach the ${fmtPct(sow.marginFloorPct, 0)} margin floor in ${MONTHS[mToFloor]}`} description={`A ${hikePct}% appraisal on ${MONTHS[cycleMonth]} with the bill rate frozen compresses margin from ${fmtPct(econ.marginPct)} to ${fmtPct(endMargin)}.`} />
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}><Card size="small" title="Margin trend (projected)"><TrendChart data={trend} xKey="month" series={[{ key: 'Margin %', name: 'Margin %' }]} floorPct={sow.marginFloorPct * 100} /></Card></Col>
        <Col xs={24} lg={10}><Card size="small" title="Monthly margin bridge"><MarginBridge data={bridge} /><Text type="secondary" style={{ fontSize: 11 }}>Revenue {fmtMoney(adjEcon.revenueMonthlyUsd, config.baseCurrency, { compact: true })} − loaded cost {fmtMoney(adjEcon.costMonthlyUsd, config.baseCurrency, { compact: true })} = margin {fmtMoney(adjEcon.profitMonthlyUsd, config.baseCurrency, { compact: true })}</Text></Card></Col>
      </Row>

      <Card size="small" title="Loaded-cost breakdown (monthly, team)" style={{ marginTop: 16 }}>
        <Table size="small" pagination={false} dataSource={breakdown} columns={[
          { title: 'Component', dataIndex: 'component' },
          { title: `Monthly cost (${config.baseCurrency})`, dataIndex: 'usd', align: 'right', render: (v: number) => v.toLocaleString() },
          { title: 'Share', dataIndex: 'usd', align: 'right', render: (v: number) => fmtPct(v / adjEcon.costMonthlyUsd) },
        ]} />
      </Card>
    </>
  );
}
