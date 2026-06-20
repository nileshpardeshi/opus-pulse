import { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Input, Typography, Space, Alert, App } from 'antd';
import { useStore } from '../store';
import { ROLES } from '../rbac/roles';
import { PageHeader, useCanSee } from '../components/common';
import type { Approval, ApprovalStatus } from '../types';

const { Text } = Typography;
const TYPE_LABEL: Record<string, string> = { 'price-below-target': 'Price below target', 'rate-revision': 'Rate revision', 'ai-override': 'AI override', 'change-request': 'Change request', discount: 'Discount' };
const STATUS_COLOR: Record<string, string> = { pending: 'processing', approved: 'success', rejected: 'error' };

export default function Approvals() {
  const { approvals, decideApproval, currentRole } = useStore();
  const { message } = App.useApp();
  const canApprove = useCanSee('approve');
  const [editing, setEditing] = useState<{ a: Approval; status: ApprovalStatus } | null>(null);
  const [reason, setReason] = useState('');

  const decide = () => {
    if (editing) {
      decideApproval(editing.a.id, editing.status, reason.trim() || (editing.status === 'approved' ? 'Approved' : 'Rejected'));
      message.success(`Request ${editing.status}`);
      setEditing(null);
      setReason('');
    }
  };

  if (!canApprove) {
    return (<><PageHeader title="Approvals" /><Alert type="warning" showIcon message="Approvals inbox is for approver roles" description="Switch to CDO or Finance to review pending approvals (maker-checker, Module P)." /></>);
  }

  const myQueue = approvals.filter((a) => ROLES[currentRole].can.approve && (a.approverRole === currentRole || currentRole === 'cdo'));

  return (
    <>
      <PageHeader title="Approvals inbox" subtitle="Maker-checker on sensitive pricing, rate revisions, overrides & CRs (Module P)" />
      <Card size="small">
        <Table size="small" pagination={false} dataSource={myQueue.map((a) => ({ key: a.id, ...a }))} columns={[
          { title: 'Action', dataIndex: 'actionType', render: (t: string) => <Tag>{TYPE_LABEL[t] ?? t}</Tag> },
          { title: 'Summary', dataIndex: 'summary' },
          { title: 'Requested by', dataIndex: 'requestedBy' },
          { title: 'Approver', dataIndex: 'approverRole', render: (r: string) => ROLES[r as keyof typeof ROLES].name },
          { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={STATUS_COLOR[s]}>{s}</Tag> },
          { title: 'Decision', key: 'act', render: (_: unknown, r) => r.status === 'pending' ? (
            <Space>
              <Button size="small" type="primary" onClick={() => { setEditing({ a: r, status: 'approved' }); }}>Approve</Button>
              <Button size="small" danger onClick={() => { setEditing({ a: r, status: 'rejected' }); }}>Reject</Button>
            </Space>
          ) : <Text type="secondary" style={{ fontSize: 12 }}>{r.reason}</Text> },
        ]} locale={{ emptyText: 'No approvals in your queue' }} />
      </Card>
      <Card size="small" style={{ marginTop: 16 }}>
        <Text type="secondary">Governed actions stay blocked until approved; every decision is audited with user, timestamp, and reason (AC-P1/P2). Change-request approvals propagate to the CR register.</Text>
      </Card>

      <Modal title={editing?.status === 'approved' ? 'Approve request' : 'Reject request'} open={!!editing} onCancel={() => setEditing(null)} onOk={decide} okText={editing?.status === 'approved' ? 'Approve' : 'Reject'} okButtonProps={{ danger: editing?.status === 'rejected' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>{editing?.a.summary}</Text>
          <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for the decision (audited)" />
        </Space>
      </Modal>
    </>
  );
}
