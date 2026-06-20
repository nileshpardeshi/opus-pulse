import { Card, Tabs, Table, InputNumber, Select, Form, Tag, Typography, Switch } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { PageHeader, Restricted, useCanSee } from '../components/common';
import { ROLE_LIST } from '../rbac/roles';
import { loadedCostAnnual } from '../engines/margin';
import { fmtMoney } from '../utils';
import type { CurrencyCode } from '../types';

const { Text } = Typography;
const CAPS = ['salary', 'margin', 'clientRate', 'marketplace', 'attrition', 'approve', 'admin'] as const;

export default function Admin() {
  const { employees, billRates, clients, calendars, config, updateConfig, updateEmployee, auditEvents } = useStore();
  const canSalary = useCanSee('salary');

  const employeesTab = (
    <Table size="small" scroll={{ x: 720 }} dataSource={employees.map((e) => ({ key: e.id, ...e }))} pagination={{ pageSize: 8 }} columns={[
      { title: 'Name', dataIndex: 'name' },
      { title: 'Role', dataIndex: 'role' },
      { title: 'Country', dataIndex: 'country' },
      { title: 'Base salary', dataIndex: 'baseSalary', align: 'right', render: (v: number, r) => canSalary ? <InputNumber size="small" value={v} formatter={(x) => `${r.currency} ${x}`} parser={(x) => Number((x ?? '').replace(/[^\d]/g, ''))} onChange={(nv) => updateEmployee(r.id, { baseSalary: nv ?? v, costLineItems: r.costLineItems.map((li) => li.component === 'base_salary' ? { ...li, value: nv ?? v } : li) })} style={{ width: 150 }} /> : <Restricted cap="salary"><span /></Restricted> },
      { title: 'Loaded cost (annual)', key: 'lc', align: 'right', render: (_: unknown, r) => canSalary ? fmtMoney(loadedCostAnnual(r), r.currency, { compact: true }) : <Restricted cap="salary"><span /></Restricted> },
      { title: 'Status', dataIndex: 'status', render: (s: string, r) => <Select size="small" value={s} onChange={(v) => updateEmployee(r.id, { status: v as 'active' | 'on-bench' | 'left' })} options={[{ value: 'active', label: 'Active' }, { value: 'on-bench', label: 'On bench' }, { value: 'left', label: 'Left' }]} style={{ width: 110 }} /> },
    ]} />
  );

  const ratesTab = (
    <Table size="small" scroll={{ x: 720 }} dataSource={billRates.slice(0, 60).map((r) => ({ key: r.id, ...r, clientName: clients.find((c) => c.id === r.clientId)?.name }))} pagination={{ pageSize: 8 }} columns={[
      { title: 'Client', dataIndex: 'clientName' },
      { title: 'Role', dataIndex: 'role' },
      { title: 'Location', dataIndex: 'location' },
      { title: 'Tenure', dataIndex: 'tenureBand' },
      { title: 'Rate/hr', key: 'rate', align: 'right', render: (_: unknown, r) => <Restricted cap="clientRate">{`${r.currency} ${r.rate}`}</Restricted> },
      { title: 'Effective from', dataIndex: 'effectiveFrom', render: (v: string) => new Date(v) > new Date('2026-06-21') ? <Tag color="blue">{v} (future)</Tag> : v },
    ]} />
  );

  const configTab = (
    <Form layout="vertical" style={{ maxWidth: 520 }}>
      <Form.Item label="Base reporting currency"><Select value={config.baseCurrency} onChange={(v: CurrencyCode) => updateConfig({ baseCurrency: v })} options={['USD', 'INR', 'GBP', 'CAD'].map((c) => ({ value: c, label: c }))} style={{ width: 160 }} /></Form.Item>
      <Form.Item label="FX policy"><Select value={config.fxPolicy} onChange={(v) => updateConfig({ fxPolicy: v as 'period-rate' | 'spot' })} options={[{ value: 'period-rate', label: 'Period rate' }, { value: 'spot', label: 'Spot' }]} style={{ width: 160 }} /></Form.Item>
      <Form.Item label="Minimum margin % (pricing floor)"><InputNumber min={0} max={0.6} step={0.01} value={config.minMarginPct} onChange={(v) => updateConfig({ minMarginPct: v ?? config.minMarginPct })} /></Form.Item>
      <Form.Item label="Margin floor %"><InputNumber min={0} max={0.6} step={0.01} value={config.marginFloorPct} onChange={(v) => updateConfig({ marginFloorPct: v ?? config.marginFloorPct })} /></Form.Item>
      <Form.Item label="Focus factor"><InputNumber min={0.4} max={1} step={0.05} value={config.focusFactor} onChange={(v) => updateConfig({ focusFactor: v ?? config.focusFactor })} /></Form.Item>
      <Form.Item label="Default holidays / leaves (per year)"><InputNumber value={config.defaultHolidays} onChange={(v) => updateConfig({ defaultHolidays: v ?? config.defaultHolidays })} /> <InputNumber value={config.defaultLeaves} onChange={(v) => updateConfig({ defaultLeaves: v ?? config.defaultLeaves })} style={{ marginLeft: 8 }} /></Form.Item>
      <Form.Item label="Approval threshold — CR value (USD)"><InputNumber min={0} step={1000} value={config.approvalThresholds.crValueUsd} onChange={(v) => updateConfig({ approvalThresholds: { ...config.approvalThresholds, crValueUsd: v ?? 0 } })} style={{ width: 160 }} /></Form.Item>
    </Form>
  );

  const calendarsTab = (
    <Table size="small" dataSource={calendars.map((c) => ({ key: c.country, ...c }))} pagination={false} columns={[
      { title: 'Country', dataIndex: 'country' },
      { title: 'Default leaves', dataIndex: 'defaultAnnualLeaves', align: 'right' },
      { title: 'Holidays', dataIndex: 'holidays', render: (h: { name: string }[]) => h.map((x) => <Tag key={x.name}>{x.name}</Tag>) },
    ]} />
  );

  const rbacTab = (
    <Table size="small" rowKey="key" pagination={false} dataSource={ROLE_LIST.map((r) => ({ ...r }))} columns={[
      { title: 'Role', dataIndex: 'name', fixed: 'left' as const, render: (v: string, r) => <div><Text strong>{v}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.description}</Text></div> },
      ...CAPS.map((c) => ({ title: c, key: c, align: 'center' as const, render: (_: unknown, r: (typeof ROLE_LIST)[number]) => (r.can[c] ? <CheckOutlined style={{ color: '#1a7f37' }} /> : <CloseOutlined style={{ color: '#cf222e' }} />) })),
    ]} scroll={{ x: 800 }} />
  );

  const auditTab = (
    <Table size="small" dataSource={auditEvents.map((a) => ({ key: a.id, ...a }))} pagination={{ pageSize: 10 }} columns={[
      { title: 'When', dataIndex: 'at', render: (v: string) => new Date(v).toLocaleString() },
      { title: 'User', dataIndex: 'userName' },
      { title: 'Entity', dataIndex: 'entity' },
      { title: 'Action', dataIndex: 'action', render: (v: string) => <Tag>{v}</Tag> },
      { title: 'Detail', dataIndex: 'detail' },
    ]} />
  );

  return (
    <>
      <PageHeader title="Admin" subtitle="Master data, cost & overhead config, RBAC, audit (Module A + config)" />
      <Card size="small">
        <Tabs items={[
          { key: 'emp', label: 'Employees', children: employeesTab },
          { key: 'rates', label: 'Bill rates', children: ratesTab },
          { key: 'cfg', label: 'Cost & config', children: configTab },
          { key: 'cal', label: 'Calendars', children: calendarsTab },
          { key: 'rbac', label: 'RBAC matrix', children: rbacTab },
          { key: 'audit', label: 'Audit log', children: auditTab },
        ]} />
      </Card>
    </>
  );
}
