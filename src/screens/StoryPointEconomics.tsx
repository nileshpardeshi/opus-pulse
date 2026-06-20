import { useState, useMemo } from 'react';
import { Row, Col, Card, Table, Typography, InputNumber, Tag } from 'antd';
import { useStore } from '../store';
import { clientName } from '../selectors';
import { PageHeader, KpiCard, useCanSee } from '../components/common';
import { TrendChart } from '../components/charts';
import { projectEconomics } from '../engines/margin';
import { spEconomics } from '../engines/spEconomics';
import { convert, fmtMoney, fmtPct } from '../utils';

const { Text } = Typography;

export default function StoryPointEconomics() {
  const { features, milestones, projects, teams, allocations, employees, clients, config } = useStore();
  const canMargin = useCanSee('margin');
  const [spToHoursOverride, setSpToHoursOverride] = useState<Record<string, number>>({});

  const rows = useMemo(() => features.map((f) => {
    const project = projects.find((p) => p.id === f.projectId)!;
    const team = teams.find((t) => t.id === project.teamId)!;
    const spToHours = spToHoursOverride[team.id] ?? team.spToHours;
    const econ = projectEconomics(project, allocations, employees);
    const teamSize = employees.filter((e) => e.teamId === team.id && e.status === 'active').length || 1;
    const blendedHourlyCost = econ.costMonthlyUsd / (teamSize * 160);

    const fMilestones = milestones.filter((m) => m.featureId === f.id);
    const price = fMilestones.length
      ? fMilestones.reduce((s, m) => s + convert(m.price.amount, m.price.currency, config.baseCurrency), 0)
      : (f.sizeStoryPoints * spToHours * blendedHourlyCost) / (1 - 0.33); // priced to ~33% if no milestones
    const cost = f.sizeStoryPoints * spToHours * blendedHourlyCost;
    const e = spEconomics(price, cost, f.sizeStoryPoints);
    return {
      key: f.id,
      feature: f.name,
      client: clientName(clients, project.clientId),
      sp: f.sizeStoryPoints,
      manHours: Math.round(f.sizeStoryPoints * spToHours),
      teamId: team.id,
      spToHours,
      ...e,
    };
  }), [features, milestones, projects, teams, allocations, employees, clients, config.baseCurrency, spToHoursOverride]);

  const tokenization = rows.find((r) => r.key === 'feat_token');
  const piTrend = ['PI-1', 'PI-2', 'PI-3', 'PI-4', 'PI-5'].map((pi, i) => ({ pi, 'Margin/SP %': 24 + i * 2.5 }));

  if (!canMargin) return (<><PageHeader title="Story Point economics" /><Card><Text type="warning">SP economics (cost/profit) is restricted for your role.</Text></Card></>);

  const uniqueTeams = [...new Map(rows.map((r) => [r.teamId, r])).values()];

  return (
    <>
      <PageHeader title="Story Point economics" subtitle="Revenue / Cost / Profit / Margin per SP — the unit economics of delivery (Module I)" />
      {tokenization && (
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}><KpiCard title="Tokenization Revenue/SP" value={tokenization.revenuePerSp} money currency={config.baseCurrency} /></Col>
          <Col xs={12} md={6}><KpiCard title="Cost/SP" value={tokenization.costPerSp} money currency={config.baseCurrency} /></Col>
          <Col xs={12} md={6}><KpiCard title="Profit/SP" value={tokenization.profitPerSp} money currency={config.baseCurrency} accent="success" /></Col>
          <Col xs={12} md={6}><KpiCard title="Margin/SP" value={tokenization.marginPerSpPct * 100} precision={1} suffix="%" accent="success" /></Col>
        </Row>
      )}

      <Card size="small" title="SP economics by feature (ranked by margin/SP)" style={{ marginTop: 16 }}>
        <Table size="small" pagination={false} dataSource={[...rows].sort((a, b) => b.marginPerSpPct - a.marginPerSpPct)} columns={[
          { title: 'Feature', dataIndex: 'feature' },
          { title: 'Customer', dataIndex: 'client' },
          { title: 'SP', dataIndex: 'sp', align: 'right' },
          { title: 'Man-hrs', dataIndex: 'manHours', align: 'right' },
          { title: 'Revenue/SP', dataIndex: 'revenuePerSp', align: 'right', render: (v: number) => fmtMoney(v, config.baseCurrency) },
          { title: 'Cost/SP', dataIndex: 'costPerSp', align: 'right', render: (v: number) => fmtMoney(v, config.baseCurrency) },
          { title: 'Profit/SP', dataIndex: 'profitPerSp', align: 'right', render: (v: number) => <Text type={v >= 0 ? 'success' : 'danger'}>{fmtMoney(v, config.baseCurrency)}</Text> },
          { title: 'Margin/SP', dataIndex: 'marginPerSpPct', align: 'right', defaultSortOrder: 'descend', sorter: (a, b) => a.marginPerSpPct - b.marginPerSpPct, render: (v: number) => <Tag color={v > 0.3 ? 'green' : v > 0.15 ? 'gold' : 'red'}>{fmtPct(v)}</Tag> },
        ]} />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}><Card size="small" title="Margin/SP trend over PIs"><TrendChart data={piTrend} xKey="pi" series={[{ key: 'Margin/SP %', name: 'Margin/SP %' }]} height={220} /></Card></Col>
        <Col xs={24} lg={10}><Card size="small" title="SP → hours conversion (team-specific, FR-I2)">
          <Table size="small" pagination={false} dataSource={uniqueTeams.map((r) => ({ key: r.teamId, teamId: r.teamId, name: teams.find((t) => t.id === r.teamId)?.name, spToHours: r.spToHours }))} columns={[
            { title: 'Team', dataIndex: 'name' },
            { title: 'SP → hours', dataIndex: 'spToHours', align: 'right', render: (v: number, r) => <InputNumber size="small" min={2} max={12} step={0.5} value={v} onChange={(nv) => setSpToHoursOverride((m) => ({ ...m, [r.teamId]: nv ?? v }))} /> },
          ]} />
          <Text type="secondary" style={{ fontSize: 11 }}>Derived from each team's historical SP-per-hour — never a single global constant.</Text>
        </Card></Col>
      </Row>
    </>
  );
}
