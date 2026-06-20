import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Select, Input, Typography, Space, Tooltip } from 'antd';
import { useStore } from '../store';
import { useRiskSignals, clientName } from '../selectors';
import { PageHeader, AiBadge, DriverList, Restricted } from '../components/common';
import type { RiskClassification, RiskSignal } from '../types';
import { fmtPct, fmtMoney } from '../utils';

const { Text, Paragraph } = Typography;
const CLASS_COLOR: Record<string, string> = { Revise: 'gold', Convert: 'blue', Exit: 'red' };

export default function MarginRiskAI() {
  const { projects, clients, overrideRisk } = useStore();
  const risks = useRiskSignals();
  const [editing, setEditing] = useState<RiskSignal | null>(null);
  const [cls, setCls] = useState<RiskClassification>('Revise');
  const [reason, setReason] = useState('');

  const submitOverride = () => {
    if (editing && reason.trim()) {
      overrideRisk(editing.projectId, cls, reason.trim());
      setEditing(null);
      setReason('');
    }
  };

  return (
    <>
      <PageHeader title="Margin-risk (AI)" subtitle="Erosion forecast, Revise/Convert/Exit, explainable drivers (Module D)" extra={<AiBadge />} />
      <Card size="small">
        <Table
          rowKey="projectId"
          size="small"
          pagination={false}
          dataSource={[...risks].sort((a, b) => b.floorBreachProbability - a.floorBreachProbability)}
          expandable={{
            expandedRowRender: (r) => (
              <Space size={32} align="start" style={{ width: '100%' }}>
                <div style={{ minWidth: 260 }}><Text strong>Top drivers</Text><DriverList drivers={r.drivers} /></div>
                <div><Text strong>Recommended action</Text><Paragraph style={{ marginBottom: 4 }}>{r.recommendedAction}</Paragraph>
                  <Restricted cap="attrition"><Text type="secondary" style={{ fontSize: 12 }}>Expected backfill-cost delta: {fmtMoney(r.backfillCostDelta.amount, r.backfillCostDelta.currency)}</Text></Restricted>
                </div>
                {r.override && <div><Text strong>Override</Text><Paragraph type="warning" style={{ fontSize: 12 }}>{r.override.user}: "{r.override.reason}"</Paragraph></div>}
              </Space>
            ),
          }}
          columns={[
            { title: 'Engagement', dataIndex: 'projectId', render: (id: string) => { const p = projects.find((x) => x.id === id)!; return <Space direction="vertical" size={0}>{p.name}<Text type="secondary" style={{ fontSize: 11 }}>{clientName(clients, p.clientId)}</Text></Space>; } },
            { title: 'Floor-breach risk', dataIndex: 'floorBreachProbability', align: 'right', defaultSortOrder: 'descend', sorter: (a, b) => a.floorBreachProbability - b.floorBreachProbability, render: (v: number) => <Text type={v > 0.6 ? 'danger' : undefined}>{fmtPct(v, 0)}</Text> },
            { title: 'Classification', dataIndex: 'classification', render: (c: string, r) => <Tag color={CLASS_COLOR[c]}>{c}{r.override ? ' •' : ''}</Tag>, filters: [{ text: 'Revise', value: 'Revise' }, { text: 'Convert', value: 'Convert' }, { text: 'Exit', value: 'Exit' }], onFilter: (v, r) => r.classification === v },
            { title: 'Conversion', dataIndex: 'conversionScore', align: 'right', sorter: (a, b) => a.conversionScore - b.conversionScore, render: (v: number) => `${v}/100` },
            { title: 'Revision prob.', dataIndex: 'revisionProbability', align: 'right', render: (v: number) => `${v}%` },
            { title: 'Attrition risk', dataIndex: 'attritionRisk', align: 'right', render: (v: number) => <Restricted cap="attrition" label="restricted"><Text type={v > 50 ? 'danger' : undefined}>{v}/100</Text></Restricted> },
            { title: '', key: 'act', render: (_: unknown, r) => <Tooltip title="Override AI recommendation"><Button size="small" onClick={() => { setEditing(r); setCls(r.classification); }}>Override</Button></Tooltip> },
          ]}
        />
      </Card>

      <Modal title="Override recommendation" open={!!editing} onCancel={() => setEditing(null)} onOk={submitOverride} okButtonProps={{ disabled: !reason.trim() }} okText="Record override">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">Overrides are advisory, logged with user + timestamp + reason, and audited (AC-D2).</Text>
          <div><Text>Classification</Text><Select value={cls} onChange={setCls} style={{ width: '100%' }} options={['Revise', 'Convert', 'Exit'].map((c) => ({ value: c, label: c }))} /></div>
          <div><Text>Reason</Text><Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why override the AI recommendation?" /></div>
        </Space>
      </Modal>
    </>
  );
}
