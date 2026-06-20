import { useMemo } from 'react';
import { Card, List, Tag, Button, Space, Typography, Segmented, Empty, App } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { ROLES } from '../rbac/roles';
import { PageHeader } from '../components/common';
import type { AlertSeverity, AlertStatus } from '../types';

const { Text } = Typography;
const SEV_COLOR: Record<AlertSeverity, string> = { critical: 'red', warning: 'gold', info: 'blue' };

export default function Alerts() {
  const { alerts, currentRole, setAlertStatus } = useStore();
  const { message } = App.useApp();
  const role = ROLES[currentRole];
  const [filter, setFilter] = useState<'all' | AlertStatus>('all');

  const visible = useMemo(
    () => alerts.filter((a) => (!a.requires || role.can[a.requires]) && (filter === 'all' || a.status === filter)),
    [alerts, role, filter],
  );

  return (
    <>
      <PageHeader title="Alerts" subtitle="Early-warning notification center — RBAC-filtered (Module M)" extra={<Segmented value={filter} onChange={(v) => setFilter(v as typeof filter)} options={[{ label: 'All', value: 'all' }, { label: 'New', value: 'new' }, { label: 'Acknowledged', value: 'acknowledged' }, { label: 'Resolved', value: 'resolved' }]} />} />
      <Card size="small">
        {visible.length === 0 ? <Empty description="No alerts for this view" /> : (
          <List
            dataSource={visible}
            renderItem={(a) => (
              <List.Item
                actions={[
                  <Link key="src" to={a.sourceScreen}>View source →</Link>,
                  a.status === 'new' ? <Button key="ack" size="small" icon={<CheckOutlined />} onClick={() => { setAlertStatus(a.id, 'acknowledged'); message.success('Acknowledged'); }}>Ack</Button> : null,
                  a.status !== 'resolved' ? <Button key="res" size="small" onClick={() => { setAlertStatus(a.id, 'resolved'); message.success('Resolved'); }}>Resolve</Button> : null,
                  a.status === 'new' ? <Button key="snz" size="small" icon={<ClockCircleOutlined />} onClick={() => { setAlertStatus(a.id, 'snoozed'); }}>Snooze</Button> : null,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<BellOutlined style={{ fontSize: 18, color: a.severity === 'critical' ? '#cf222e' : a.severity === 'warning' ? '#bf8700' : '#1f6feb' }} />}
                  title={<Space><Text strong>{a.title}</Text><Tag color={SEV_COLOR[a.severity]}>{a.severity}</Tag>{a.status !== 'new' && <Tag>{a.status}</Tag>}</Space>}
                  description={<Space direction="vertical" size={0}><Text type="secondary">{a.driver}</Text><Text type="secondary" style={{ fontSize: 11 }}>{a.raisedAt}</Text></Space>}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  );
}
