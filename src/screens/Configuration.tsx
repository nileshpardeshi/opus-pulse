import { useState } from 'react';
import { Row, Col, Card, Table, Button, Input, InputNumber, Select, Tag, Typography, Space, List, Popconfirm, App, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, BankOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useStore, uid } from '../store';
import { PageHeader } from '../components/common';
import { CURRENCIES, DELIVERY_MODELS, EXPERIENCE_BANDS, COMMON_ROLES, type Currency, type DeliveryModel } from '../types';
import { fmtMoney } from '../utils';

const { Text } = Typography;
const MODEL_COLOR: Record<DeliveryModel, string> = { TNM: 'blue', 'Fixed Bid': 'gold', 'Outcome Based': 'green', 'Managed Capacity': 'cyan' };

export default function Configuration() {
  const s = useStore();
  const { message } = App.useApp();
  const [selectedClient, setSelectedClient] = useState<string | undefined>(s.clients[0]?.id);
  const client = s.clients.find((c) => c.id === selectedClient) ?? s.clients[0];

  const clientSows = s.sows.filter((w) => w.clientId === client?.id);
  const clientProjects = s.projects.filter((p) => p.clientId === client?.id);

  const addAccount = () => {
    const id = uid('cli');
    s.addClient({ id, name: 'New Account', currency: 'USD', roleRates: [] });
    setSelectedClient(id);
    message.success('Account added');
  };

  if (!client) return <PageHeader title="Configuration" subtitle="No accounts yet" extra={<Button type="primary" onClick={addAccount}>Add account</Button>} />;

  return (
    <>
      <PageHeader title="Configuration" subtitle="Define accounts, their rate cards, SOWs and projects — inherited by both simulators" />
      <Row gutter={[16, 16]}>
        {/* Accounts list */}
        <Col xs={24} lg={6}>
          <Card size="small" title="Accounts" extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={addAccount}>Add</Button>}>
            <List
              dataSource={s.clients}
              renderItem={(c) => (
                <List.Item
                  onClick={() => setSelectedClient(c.id)}
                  style={{ cursor: 'pointer', background: c.id === client.id ? '#e6f0ff' : undefined, borderRadius: 6, paddingInline: 10 }}
                  actions={[
                    <Popconfirm key="d" title="Delete account and its projects?" onConfirm={() => { s.deleteClient(c.id); setSelectedClient(s.clients.find((x) => x.id !== c.id)?.id); }}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta avatar={<BankOutlined style={{ fontSize: 18, color: '#1f6feb' }} />} title={c.name} description={`${c.currency} · ${c.roleRates.length} rates`} />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Selected account detail */}
        <Col xs={24} lg={18}>
          <Card size="small" title="Account details" style={{ marginBottom: 16 }}>
            <Space size={16} wrap>
              <div><Text type="secondary">Name</Text><br /><Input value={client.name} onChange={(e) => s.updateClient(client.id, { name: e.target.value })} style={{ width: 240 }} /></div>
              <div><Text type="secondary">Default currency</Text><br /><Select value={client.currency} onChange={(v: Currency) => s.updateClient(client.id, { currency: v })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} style={{ width: 120 }} /></div>
            </Space>
          </Card>

          {/* Rate card */}
          <Card size="small" title="Standard role / experience rate card" style={{ marginBottom: 16 }}
            extra={<Button size="small" icon={<PlusOutlined />} onClick={() => s.addRoleRate(client.id, { id: uid('rr'), role: 'Developer', experience: '3-5 yrs', rate: 25, currency: client.currency })}>Add rate</Button>}>
            <Table size="small" pagination={false} rowKey="id" dataSource={client.roleRates}
              columns={[
                { title: 'Role', dataIndex: 'role', render: (v: string, r) => <Select size="small" value={v} onChange={(nv) => s.updateRoleRate(client.id, r.id, { role: nv })} options={COMMON_ROLES.map((x) => ({ value: x, label: x }))} style={{ width: 170 }} showSearch /> },
                { title: 'Experience', dataIndex: 'experience', render: (v: string, r) => <Select size="small" value={v} onChange={(nv) => s.updateRoleRate(client.id, r.id, { experience: nv })} options={EXPERIENCE_BANDS.map((x) => ({ value: x, label: x }))} style={{ width: 110 }} /> },
                { title: 'Rate / hr', dataIndex: 'rate', align: 'right', render: (v: number, r) => <InputNumber size="small" min={0} value={v} onChange={(nv) => s.updateRoleRate(client.id, r.id, { rate: nv ?? 0 })} style={{ width: 100 }} /> },
                { title: 'Currency', dataIndex: 'currency', render: (v: Currency, r) => <Select size="small" value={v} onChange={(nv: Currency) => s.updateRoleRate(client.id, r.id, { currency: nv })} options={CURRENCIES.map((c) => ({ value: c, label: c }))} style={{ width: 84 }} /> },
                { title: '', key: 'd', width: 40, render: (_: unknown, r) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => s.deleteRoleRate(client.id, r.id)} /> },
              ]}
              locale={{ emptyText: 'No rates — add the account rate card' }}
            />
          </Card>

          {/* SOWs */}
          <Card size="small" title="Statements of Work (SOW)" style={{ marginBottom: 16 }}
            extra={<Button size="small" icon={<PlusOutlined />} onClick={() => s.addSow({ id: uid('sow'), clientId: client.id, name: 'New SOW', model: 'TNM', startDate: '2026-01-01', endDate: '2026-12-31', owner: '' })}>Add SOW</Button>}>
            <Table size="small" pagination={false} rowKey="id" dataSource={clientSows} scroll={{ x: 720 }}
              columns={[
                { title: 'SOW name', dataIndex: 'name', render: (v: string, r) => <Input size="small" value={v} onChange={(e) => s.updateSow(r.id, { name: e.target.value })} style={{ width: 170 }} /> },
                { title: 'Delivery model', dataIndex: 'model', render: (v: DeliveryModel, r) => <Select size="small" value={v} onChange={(nv: DeliveryModel) => s.updateSow(r.id, { model: nv })} options={DELIVERY_MODELS.map((m) => ({ value: m, label: m }))} style={{ width: 150 }} /> },
                { title: 'Start', dataIndex: 'startDate', render: (v: string, r) => <DatePicker size="small" value={dayjs(v)} onChange={(d) => s.updateSow(r.id, { startDate: d?.format('YYYY-MM-DD') ?? v })} /> },
                { title: 'End', dataIndex: 'endDate', render: (v: string, r) => <DatePicker size="small" value={dayjs(v)} onChange={(d) => s.updateSow(r.id, { endDate: d?.format('YYYY-MM-DD') ?? v })} /> },
                { title: 'Owner', dataIndex: 'owner', render: (v: string, r) => <Input size="small" value={v} onChange={(e) => s.updateSow(r.id, { owner: e.target.value })} placeholder="Owner" style={{ width: 130 }} /> },
                { title: '', key: 'd', width: 40, render: (_: unknown, r) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => s.deleteSow(r.id)} /> },
              ]}
              locale={{ emptyText: 'No SOWs yet' }}
            />
          </Card>

          {/* Projects */}
          <Card size="small" title="Projects"
            extra={<Button size="small" icon={<PlusOutlined />} disabled={clientSows.length === 0} onClick={() => s.addProject({ id: uid('prj'), clientId: client.id, name: 'New Project', sowId: clientSows[0].id, teamSize: 8, hoursPerDay: 8 })}>Add project</Button>}>
            <Table size="small" pagination={false} rowKey="id" dataSource={clientProjects} scroll={{ x: 720 }}
              columns={[
                { title: 'Project', dataIndex: 'name', render: (v: string, r) => <Input size="small" value={v} onChange={(e) => s.updateProject(r.id, { name: e.target.value })} style={{ width: 180 }} /> },
                { title: 'SOW', dataIndex: 'sowId', render: (v: string, r) => <Select size="small" value={v} onChange={(nv) => s.updateProject(r.id, { sowId: nv })} options={clientSows.map((w) => ({ value: w.id, label: w.name }))} style={{ width: 170 }} /> },
                { title: 'Model', key: 'model', render: (_: unknown, r) => { const m = clientSows.find((w) => w.id === r.sowId)?.model ?? 'TNM'; return <Tag color={MODEL_COLOR[m]}>{m}</Tag>; } },
                { title: 'Team size', dataIndex: 'teamSize', align: 'right', render: (v: number, r) => <InputNumber size="small" min={1} value={v} onChange={(nv) => s.updateProject(r.id, { teamSize: nv ?? 1 })} style={{ width: 80 }} /> },
                { title: 'Hrs/day', dataIndex: 'hoursPerDay', render: (v: number, r) => <Select size="small" value={v} onChange={(nv) => s.updateProject(r.id, { hoursPerDay: nv as 8 | 9 })} options={[{ value: 8, label: '8' }, { value: 9, label: '9' }]} style={{ width: 70 }} /> },
                { title: '', key: 'd', width: 40, render: (_: unknown, r) => <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => s.deleteProject(r.id)} /> },
              ]}
              locale={{ emptyText: clientSows.length === 0 ? 'Add a SOW first' : 'No projects yet' }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Projects inherit their delivery model from the selected SOW. A SOW can be shared across multiple projects.</Text>
          </Card>
        </Col>
      </Row>
    </>
  );
}
