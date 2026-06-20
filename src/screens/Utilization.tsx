import { useMemo } from 'react';
import { Row, Col, Card, Table, Tag, Progress, Typography } from 'antd';
import { useStore } from '../store';
import { PageHeader, KpiCard, useCanSee } from '../components/common';
import { ComparisonBar } from '../components/charts';
import { utilizationSummary, utilizationFlag } from '../engines/utilization';
import { loadedCostMonthlyUsd } from '../engines/margin';
import { fmtMoney, fmtPct } from '../utils';

const { Text } = Typography;
const FLAG_COLOR = { under: 'gold', over: 'red', ok: 'green' } as const;

export default function Utilization() {
  const { utilizationRecords, employees, teams, config } = useStore();
  const canMargin = useCanSee('margin');
  const summary = useMemo(() => utilizationSummary(utilizationRecords, employees), [utilizationRecords, employees]);

  const byTeam = useMemo(() => teams.map((t) => {
    const teamEmps = employees.filter((e) => e.teamId === t.id);
    const recs = utilizationRecords.filter((u) => teamEmps.some((e) => e.id === u.employeeId));
    const avg = recs.length ? recs.reduce((s, r) => s + r.utilizationPct, 0) / recs.length : 0;
    return { team: t.name.replace(' Team', ''), 'Utilization %': Math.round(avg * 100), Target: 80 };
  }), [teams, employees, utilizationRecords]);

  const rows = utilizationRecords.map((u) => {
    const e = employees.find((x) => x.id === u.employeeId)!;
    return { key: u.id, name: e.name, role: e.role, team: teams.find((t) => t.id === e.teamId)?.name.replace(' Team', ''), status: e.status, util: u.utilizationPct, benchCost: e.status === 'on-bench' ? loadedCostMonthlyUsd(e) : 0 };
  });

  return (
    <>
      <PageHeader title="Utilization & bench" subtitle="Utilization %, bench cost, under/over-utilization (Module O)" />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><KpiCard title="Avg utilization" value={summary.avgUtilizationPct * 100} precision={0} suffix="%" accent={summary.avgUtilizationPct < 0.7 ? 'warning' : 'success'} /></Col>
        <Col xs={12} md={6}><KpiCard title="On bench" value={summary.benchCount} suffix=" resources" accent="warning" /></Col>
        <Col xs={12} md={6}>{canMargin ? <KpiCard title="Bench cost / mo" value={summary.benchCostMonthlyUsd} money currency={config.baseCurrency} accent="danger" /> : <Card size="small"><Text type="secondary">Bench cost restricted</Text></Card>}</Col>
        <Col xs={12} md={6}><KpiCard title="Under / over" value={summary.underUtilized} suffix={` / ${summary.overUtilized}`} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}><Card size="small" title="Utilization vs target by team"><ComparisonBar data={byTeam} xKey="team" series={[{ key: 'Utilization %', name: 'Utilization %' }, { key: 'Target', name: 'Target', color: '#6e7781' }]} /></Card></Col>
        <Col xs={24} lg={12}><Card size="small" title="Per-resource utilization">
          <Table size="small" pagination={{ pageSize: 7 }} dataSource={rows} columns={[
            { title: 'Resource', dataIndex: 'name' },
            { title: 'Team', dataIndex: 'team' },
            { title: 'Utilization', dataIndex: 'util', sorter: (a, b) => a.util - b.util, render: (v: number) => <Progress percent={Math.round(v * 100)} size="small" status={utilizationFlag(v) === 'over' ? 'exception' : 'normal'} /> },
            { title: 'Flag', dataIndex: 'util', render: (v: number) => { const f = utilizationFlag(v); return <Tag color={FLAG_COLOR[f]}>{f === 'under' ? 'under-utilized' : f === 'over' ? 'over-allocated' : 'ok'}</Tag>; } },
          ]} />
        </Card></Col>
      </Row>
    </>
  );
}
