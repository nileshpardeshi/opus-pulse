import { useState, useMemo, useEffect } from 'react';
import { Row, Col, Card, Table, Button, Input, InputNumber, Select, Form, Tag, Typography, Space, Alert, List } from 'antd';
import { PlusOutlined, DeleteOutlined, BulbOutlined, WarningOutlined } from '@ant-design/icons';
import { useStore, uid } from '../store';
import { PageHeader, KpiCard, AiBadge } from '../components/common';
import { ComparisonBar, DonutChart } from '../components/charts';
import { computeBilling, marginAdvice } from '../engines';
import { CURRENCIES, EXPERIENCE_BANDS, COMMON_ROLES, type Currency, type DeliveryModel, type BillingConfig } from '../types';
import { fmtMoney, fmtPct, MONTHS } from '../utils';

const { Text } = Typography;
const MODEL_COLOR: Record<DeliveryModel, string> = { TNM: 'blue', 'Fixed Bid': 'gold', 'Outcome Based': 'green', 'Managed Capacity': 'cyan' };

export default function BillingSimulator() {
  const s = useStore();
  const [clientId, setClientId] = useState(s.clients[0]?.id);
  const clientProjects = s.projects.filter((p) => p.clientId === clientId);
  const [projectId, setProjectId] = useState(clientProjects[0]?.id);

  useEffect(() => {
    if (clientId && !clientProjects.some((p) => p.id === projectId)) setProjectId(clientProjects[0]?.id);
  }, [clientId]); // eslint-disable-line

  useEffect(() => { if (projectId) s.getBilling(projectId); }, [projectId]); // eslint-disable-line

  const client = s.clients.find((c) => c.id === clientId);
  const project = s.projects.find((p) => p.id === projectId);
  const sow = s.sows.find((w) => w.id === project?.sowId);
  const currency = client?.currency ?? 'USD';
  const billing: BillingConfig = s.billingConfigs[projectId] ?? { projectId, resources: [], hoursPerDay: 8, annualLeaves: 18, nationalHolidays: 12, expenses: [] };

  const result = useMemo(() => computeBilling(billing, currency), [billing, currency]);
  const advice = useMemo(() => marginAdvice(result, billing), [result, billing]);

  const rateFromCard = (role: string, exp: string): { rate: number; currency: Currency } => {
    const rr = client?.roleRates.find((r) => r.role === role && r.experience === exp);
    return rr ? { rate: rr.rate, currency: rr.currency } : { rate: 25, currency };
  };

  const addResource = () => {
    const { rate, currency: cur } = rateFromCard('Developer', '3-5 yrs');
    s.addResource(projectId, { id: uid('res'), role: 'Developer', experience: '3-5 yrs', count: 1, rate, costRate: Math.round(rate * 0.6), currency: cur });
  };
  const onRoleExpChange = (rid: string, role: string, exp: string) => {
    const { rate, currency: cur } = rateFromCard(role, exp);
    s.updateResource(projectId, rid, { role, experience: exp, rate, costRate: Math.round(rate * 0.6), currency: cur });
  };

  const monthly = MONTHS.map((m) => ({ month: m, Revenue: result.monthlyRevenue, Expenses: result.monthlyExpenses, Profit: result.monthlyProfit }));
  const donut = result.expenseByCategory.map((e) => ({ name: e.category, value: Math.round(e.yearly) }));
  const healthColor = { strong: '#1a7f37', healthy: '#1a7f37', thin: '#bf8700', loss: '#cf222e' }[advice.health];

  if (!project) return <PageHeader title="Billing Simulator" subtitle="Add a project in Configuration first" />;

  return (
    <>
      <PageHeader title="Billing Simulator (TNM)" subtitle="Resources, leaves, holidays & expenses → monthly / yearly billing and margin"
        extra={<Space>
          <Select value={clientId} onChange={setClientId} options={s.clients.map((c) => ({ value: c.id, label: c.name }))} style={{ width: 160 }} />
          <Select value={projectId} onChange={setProjectId} options={clientProjects.map((p) => ({ value: p.id, label: p.name }))} style={{ width: 200 }} />
          {sow && <Tag color={MODEL_COLOR[sow.model]}>{sow.model}</Tag>}
        </Space>} />

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><KpiCard title="Monthly billing" value={result.monthlyRevenue} money currency={currency} accent="success" /></Col>
        <Col xs={12} md={6}><KpiCard title="Yearly billing" value={result.yearlyRevenue} money currency={currency} accent="success" /></Col>
        <Col xs={12} md={6}><KpiCard title="Yearly profit" value={result.yearlyProfit} money currency={currency} accent={result.yearlyProfit >= 0 ? 'success' : 'danger'} /></Col>
        <Col xs={12} md={6}><KpiCard title="Profit margin" value={result.marginPct * 100} precision={1} suffix="%" accent={result.marginPct >= 0.2 ? 'success' : result.marginPct >= 0 ? 'warning' : 'danger'} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          {/* Resources */}
          <Card size="small" title="Resources" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={addResource}>Add resource</Button>}>
            <Table size="small" pagination={false} rowKey="id" dataSource={billing.resources} scroll={{ x: 640 }}
              columns={[
                { title: 'Role', dataIndex: 'role', render: (v: string, r) => <Select size="small" value={v} onChange={(nv) => onRoleExpChange(r.id, nv, r.experience)} options={COMMON_ROLES.map((x) => ({ value: x, label: x }))} style={{ width: 150 }} showSearch /> },
                { title: 'Experience', dataIndex: 'experience', render: (v: string, r) => <Select size="small" value={v} onChange={(nv) => onRoleExpChange(r.id, r.role, nv)} options={EXPERIENCE_BANDS.map((x) => ({ value: x, label: x }))} style={{ width: 100 }} /> },
                { title: 'Count', dataIndex: 'count', align: 'right', render: (v: number, r) => <InputNumber size="small" min={1} value={v} onChange={(nv) => s.updateResource(projectId, r.id, { count: nv ?? 1 })} style={{ width: 64 }} /> },
                { title: 'Rate/hr', dataIndex: 'rate', align: 'right', render: (v: number, r) => <InputNumber size="small" min={0} value={v} onChange={(nv) => s.updateResource(projectId, r.id, { rate: nv ?? 0 })} style={{ width: 80 }} /> },
                { title: 'Cost/hr', dataIndex: 'costRate', align: 'right', render: (v: number, r) => <InputNumber size="small" min={0} value={v} onChange={(nv) => s.updateResource(projectId, r.id, { costRate: nv ?? 0 })} style={{ width: 80 }} /> },
                { title: 'Ccy', dataIndex: 'currency', render: (v: Currency, r) => <Select size="small" value={v} onChange={(nv: Currency) => s.updateResource(projectId, r.id, { currency: nv })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} style={{ width: 72 }} /> },
                { title: '', key: 'd', width: 36, render: (_: unknown, r) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => s.deleteResource(projectId, r.id)} /> },
              ]}
              locale={{ emptyText: 'Add resources to simulate billing' }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>—</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right"><Text strong>{result.headcount}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3} colSpan={4} align="right"><Text type="secondary">{result.billableDays} billable days · {result.billableHoursPerResource} hrs/yr per resource</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>

          {/* Expenses */}
          <Card size="small" title="Project expenses (cost)" style={{ marginTop: 16 }} extra={<Button size="small" icon={<PlusOutlined />} onClick={() => s.addExpense(projectId, { id: uid('exp'), category: 'New cost', amount: 1000, frequency: 'monthly', currency })}>Add expense</Button>}>
            <Table size="small" pagination={false} rowKey="id" dataSource={billing.expenses} scroll={{ x: 520 }}
              columns={[
                { title: 'Category', dataIndex: 'category', render: (v: string, r) => <Input size="small" value={v} onChange={(e) => s.updateExpense(projectId, r.id, { category: e.target.value })} style={{ width: 180 }} /> },
                { title: 'Amount', dataIndex: 'amount', align: 'right', render: (v: number, r) => <InputNumber size="small" min={0} value={v} onChange={(nv) => s.updateExpense(projectId, r.id, { amount: nv ?? 0 })} style={{ width: 110 }} /> },
                { title: 'Frequency', dataIndex: 'frequency', render: (v: string, r) => <Select size="small" value={v} onChange={(nv) => s.updateExpense(projectId, r.id, { frequency: nv as 'monthly' | 'yearly' })} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} style={{ width: 100 }} /> },
                { title: 'Ccy', dataIndex: 'currency', render: (v: Currency, r) => <Select size="small" value={v} onChange={(nv: Currency) => s.updateExpense(projectId, r.id, { currency: nv })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} style={{ width: 72 }} /> },
                { title: '', key: 'd', width: 36, render: (_: unknown, r) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => s.deleteExpense(projectId, r.id)} /> },
              ]}
              locale={{ emptyText: 'Add monthly/yearly project costs' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          {/* Calendar inputs */}
          <Card size="small" title="Company calendar & hours">
            <Form layout="vertical" size="small">
              <Row gutter={12}>
                <Col span={8}><Form.Item label="Hours / day"><Select value={billing.hoursPerDay} onChange={(v) => s.setBilling(projectId, { hoursPerDay: v })} options={[{ value: 8, label: '8' }, { value: 9, label: '9' }]} /></Form.Item></Col>
                <Col span={8}><Form.Item label="Holidays / yr"><InputNumber min={0} max={40} value={billing.nationalHolidays} onChange={(v) => s.setBilling(projectId, { nationalHolidays: v ?? 0 })} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={8}><Form.Item label="Leaves / yr"><InputNumber min={0} max={60} value={billing.annualLeaves} onChange={(v) => s.setBilling(projectId, { annualLeaves: v ?? 0 })} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 12 }}>Billable days/yr = 365 − 104 weekends − {billing.nationalHolidays} holidays − {billing.annualLeaves} leaves = <b>{result.billableDays}</b></Text>
            </Form>
          </Card>

          {/* AI advisory */}
          <Card size="small" title={<Space>AI margin advisory <AiBadge /></Space>} style={{ marginTop: 16 }}>
            <Space align="center" style={{ marginBottom: 8 }}>
              <Text>Margin:</Text><Text strong style={{ color: healthColor, fontSize: 18 }}>{fmtPct(advice.marginPct)}</Text>
              <Tag color={advice.health === 'loss' ? 'red' : advice.health === 'thin' ? 'gold' : 'green'}>{advice.health}</Tag>
            </Space>
            <Text strong><BulbOutlined style={{ color: '#1a7f37' }} /> Scope to increase margin</Text>
            <List size="small" dataSource={advice.opportunities} renderItem={(o) => <List.Item style={{ paddingBlock: 4, fontSize: 12 }}>• {o}</List.Item>} />
            <Text strong><WarningOutlined style={{ color: '#cf222e' }} /> Margin leaks</Text>
            <List size="small" dataSource={advice.leaks} renderItem={(l) => <List.Item style={{ paddingBlock: 4, fontSize: 12 }}>• {l}</List.Item>} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}><Card size="small" title="Monthly revenue · expenses · profit"><ComparisonBar data={monthly} xKey="month" series={[{ key: 'Revenue', name: 'Revenue', color: '#1a7f37' }, { key: 'Expenses', name: 'Expenses', color: '#cf222e' }, { key: 'Profit', name: 'Profit', color: '#1f6feb' }]} height={260} /></Card></Col>
        <Col xs={24} lg={10}><Card size="small" title="Expense breakdown (yearly)">{donut.length ? <DonutChart data={donut} /> : <Alert type="info" message="Add expenses to see the breakdown" />}</Card></Col>
      </Row>
    </>
  );
}
