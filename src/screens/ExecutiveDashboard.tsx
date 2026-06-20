import { Row, Col, Card, Table, Tag, Typography, Space } from 'antd';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { usePortfolioEconomics, useRiskSignals, clientName } from '../selectors';
import { KpiCard, PageHeader, AiBadge, Restricted } from '../components/common';
import { TrendChart, DonutChart } from '../components/charts';
import { DELIVERY_MODEL_LABEL } from '../types';
import { MODEL_COLORS } from '../theme';
import { fmtMoney, fmtPct } from '../utils';

const { Text } = Typography;

const CLASS_COLOR: Record<string, string> = { Revise: 'gold', Convert: 'blue', Exit: 'red' };

export default function ExecutiveDashboard() {
  const { projects, sows, clients, config } = useStore();
  const econ = usePortfolioEconomics();
  const risks = useRiskSignals();

  const modelMix = projects.reduce<Record<string, number>>((acc, p) => {
    const model = sows.find((s) => s.id === p.sowId)!.modelType;
    acc[model] = (acc[model] ?? 0) + econ.byProject[p.id].revenueMonthlyUsd;
    return acc;
  }, {});
  const donut = Object.entries(modelMix).map(([k, v]) => ({ name: DELIVERY_MODEL_LABEL[k as keyof typeof DELIVERY_MODEL_LABEL], value: Math.round(v), color: MODEL_COLORS[k] }));

  // illustrative 6-month portfolio margin trend (erosion)
  const trend = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => ({
    month: m,
    'Margin %': Math.round((econ.marginPct - i * 0.004) * 1000) / 10,
  }));

  const atRisk = [...risks].sort((a, b) => b.floorBreachProbability - a.floorBreachProbability);

  const annualForecast = econ.totalRevenue * 12;

  return (
    <>
      <PageHeader title="Executive dashboard" subtitle="Portfolio delivery-economics health" extra={<AiBadge text="Risk ranking: rules-based AI" />} />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><KpiCard title="Portfolio margin" value={econ.marginPct * 100} precision={1} suffix="%" accent={econ.marginPct < config.marginFloorPct ? 'danger' : 'success'} /></Col>
        <Col xs={12} md={6}><Restricted cap="margin"><KpiCard title="Monthly revenue" value={econ.totalRevenue} money /></Restricted></Col>
        <Col xs={12} md={6}><Restricted cap="margin"><KpiCard title="Annual forecast" value={annualForecast} money /></Restricted></Col>
        <Col xs={12} md={6}><KpiCard title="Engagements at risk" value={atRisk.filter((r) => r.classification !== 'Convert').length} suffix={` / ${projects.length}`} accent="warning" /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Portfolio margin trend" size="small">
            <TrendChart data={trend} xKey="month" series={[{ key: 'Margin %', name: 'Margin %' }]} floorPct={config.marginFloorPct * 100} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Delivery model mix (by revenue)" size="small">
            <DonutChart data={donut} />
          </Card>
        </Col>
      </Row>

      <Card title="At-risk engagement ranking" size="small" style={{ marginTop: 16 }} extra={<Link to="/risk">Open margin-risk →</Link>}>
        <Table
          rowKey="projectId"
          size="small"
          pagination={false}
          dataSource={atRisk}
          columns={[
            { title: 'Engagement', dataIndex: 'projectId', render: (id: string) => {
              const p = projects.find((x) => x.id === id)!;
              return <Space direction="vertical" size={0}><Link to="/margin">{p.name}</Link><Text type="secondary" style={{ fontSize: 11 }}>{clientName(clients, p.clientId)}</Text></Space>;
            } },
            { title: 'Margin', dataIndex: 'projectId', align: 'right', render: (id: string) => fmtPct(econ.byProject[id].marginPct) },
            { title: 'Floor-breach risk', dataIndex: 'floorBreachProbability', align: 'right', sorter: (a, b) => a.floorBreachProbability - b.floorBreachProbability, render: (v: number) => <Text type={v > 0.6 ? 'danger' : undefined}>{fmtPct(v, 0)}</Text> },
            { title: 'Months to floor', dataIndex: 'monthsToFloor', align: 'right', render: (v: number | null) => (v === null ? '—' : v) },
            { title: 'Action', dataIndex: 'classification', render: (c: string, r) => <Tag color={CLASS_COLOR[c]}>{c}{r.override ? ' (override)' : ''}</Tag> },
            { title: 'Conversion', dataIndex: 'conversionScore', align: 'right', render: (v: number) => `${v}/100` },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><Text strong>Portfolio</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><Text strong>{fmtPct(econ.marginPct)}</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">—</Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">—</Table.Summary.Cell>
              <Table.Summary.Cell index={4}>—</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right">{fmtMoney(econ.totalRevenue, config.baseCurrency, { compact: true })}/mo</Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </>
  );
}
