import { useState, useMemo } from 'react';
import { Row, Col, Card, Table, Select, InputNumber, Form, Tag, Typography, Progress } from 'antd';
import { useStore } from '../store';
import { PageHeader, KpiCard } from '../components/common';
import { computeBilling, resolveBillRate } from '../engines/tnm';
import { convert } from '../utils';
import type { Country } from '../types';

const { Text } = Typography;

// fraction of 2026 elapsed by "today" (2026-06-21)
const ELAPSED = 0.47;

export default function BillingForecast() {
  const { projects, employees, billRates, calendars, sows, config } = useStore();
  const [projectId, setProjectId] = useState(projects[0]?.id);
  const project = projects.find((p) => p.id === projectId)!;
  const sow = sows.find((s) => s.id === project.sowId)!;
  const team = employees.filter((e) => e.teamId === project.teamId && e.status !== 'left');

  const country = team[0]?.country ?? 'India';
  const calendar = calendars.find((c) => c.country === country);
  const [hoursPerDay, setHoursPerDay] = useState<number>(sow.hoursPerDay);
  const [holidays, setHolidays] = useState<number>(calendar?.holidays.length ?? config.defaultHolidays);
  const [leaves, setLeaves] = useState<number>(calendar?.defaultAnnualLeaves ?? config.defaultLeaves);

  const rows = useMemo(() => team.map((e) => {
    const rate = resolveBillRate(billRates, { clientId: project.clientId, role: e.role, location: e.country as Country, tenureBand: e.tenureBand });
    const ratePerHour = rate ? convert(rate.rate, rate.currency, config.baseCurrency) : 0;
    const b = computeBilling({ holidays, leaves, hoursPerDay, ratePerHour });
    return { key: e.id, name: e.name, role: e.role, country: e.country, ratePerHour, ...b };
  }), [team, billRates, project.clientId, config.baseCurrency, holidays, leaves, hoursPerDay]);

  const totalAnnual = rows.reduce((s, r) => s + r.annualBilling, 0);
  const totalHours = rows.reduce((s, r) => s + r.billableHours, 0);

  return (
    <>
      <PageHeader title="Billing & forecast" subtitle="Country-correct billable hours and annual billing income (Module B)" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={6}>
          <Card size="small" title="Assumptions">
            <Form layout="vertical" size="small">
              <Form.Item label="Project">
                <Select value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
              </Form.Item>
              <Form.Item label="Country calendar"><Tag>{country}</Tag><Text type="secondary" style={{ fontSize: 11 }}> ({calendar?.holidays.length ?? 0} holidays defined)</Text></Form.Item>
              <Form.Item label="Contracted hours/day">
                <Select value={hoursPerDay} onChange={setHoursPerDay} options={[{ value: 8, label: '8 hrs' }, { value: 9, label: '9 hrs' }]} />
              </Form.Item>
              <Form.Item label="Public holidays / year"><InputNumber min={0} max={40} value={holidays} onChange={(v) => setHolidays(v ?? 0)} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="Leaves / year"><InputNumber min={0} max={60} value={leaves} onChange={(v) => setLeaves(v ?? 0)} style={{ width: '100%' }} /></Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={18}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={8}><KpiCard title="Billable days / yr" value={rows[0]?.billableDays ?? 0} /></Col>
            <Col xs={12} md={8}><KpiCard title="Team billable hrs / yr" value={totalHours} /></Col>
            <Col xs={12} md={8}><KpiCard title="Annual billing" value={totalAnnual} money currency={config.baseCurrency} /></Col>
          </Row>
          <Card size="small" title="Actual-to-date vs projected-remaining" style={{ marginTop: 16 }}>
            <Progress percent={Math.round(ELAPSED * 100)} success={{ percent: Math.round(ELAPSED * 100) }} format={() => `${Math.round(ELAPSED * 100)}% of year elapsed`} />
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={12}><Text type="secondary">Actual-to-date</Text><br /><Text strong>{Math.round(totalAnnual * ELAPSED).toLocaleString()}</Text></Col>
              <Col span={12}><Text type="secondary">Projected-remaining</Text><br /><Text strong>{Math.round(totalAnnual * (1 - ELAPSED)).toLocaleString()}</Text></Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Per-resource billing" style={{ marginTop: 16 }}>
        <Table
          size="small"
          pagination={false}
          dataSource={rows}
          columns={[
            { title: 'Resource', dataIndex: 'name' },
            { title: 'Role', dataIndex: 'role' },
            { title: 'Country', dataIndex: 'country' },
            { title: `Rate/hr (${config.baseCurrency})`, dataIndex: 'ratePerHour', align: 'right', render: (v: number) => v.toFixed(2) },
            { title: 'Billable days', dataIndex: 'billableDays', align: 'right' },
            { title: 'Billable hrs', dataIndex: 'billableHours', align: 'right' },
            { title: `Annual billing (${config.baseCurrency})`, dataIndex: 'annualBilling', align: 'right', render: (v: number) => Math.round(v).toLocaleString() },
          ]}
        />
      </Card>
    </>
  );
}
