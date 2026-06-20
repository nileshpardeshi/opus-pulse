import React from 'react';
import { Card, Statistic, Tag, Tooltip, Typography, Space, Progress, Empty } from 'antd';
import { LockOutlined, RobotOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { Role } from '../types';
import { useStore } from '../store';
import { ROLES } from '../rbac/roles';
import { fmtMoney, fmtPct } from '../utils';

const { Text, Title } = Typography;

// ── RBAC-gated display ──────────────────────────────────────────────────────
type Cap = keyof Role['can'];

export function useCanSee(cap: Cap): boolean {
  return useStore((s) => ROLES[s.currentRole].can[cap]);
}

/** Render children only if the current role has the capability, else a masked tag. */
export function Restricted({ cap, children, label = 'restricted' }: { cap: Cap; children: React.ReactNode; label?: string }) {
  const ok = useCanSee(cap);
  if (ok) return <>{children}</>;
  return (
    <Tooltip title={`Hidden for your role (requires ${cap} access)`}>
      <Tag icon={<LockOutlined />} color="default">••• {label}</Tag>
    </Tooltip>
  );
}

export function MoneyText({ amount, currency = 'USD', compact, strong }: { amount: number; currency?: 'USD' | 'INR' | 'GBP' | 'CAD'; compact?: boolean; strong?: boolean }) {
  return <Text strong={strong}>{fmtMoney(amount, currency, { compact })}</Text>;
}

export function AiBadge({ text = 'AI advisory (rules-based)' }: { text?: string }) {
  return (
    <Tag icon={<RobotOutlined />} color="purple" style={{ fontWeight: 500 }}>
      {text}
    </Tag>
  );
}

export function PageHeader({ title, subtitle, extra }: { title: string; subtitle?: string; extra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>{title}</Title>
        {subtitle && <Text type="secondary">{subtitle}</Text>}
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
}

export function KpiCard({
  title, value, suffix, precision, prefix, trend, accent, money, currency = 'USD',
}: {
  title: string; value: number; suffix?: string; precision?: number; prefix?: React.ReactNode;
  trend?: number; accent?: 'success' | 'danger' | 'warning'; money?: boolean; currency?: 'USD' | 'INR' | 'GBP' | 'CAD';
}) {
  const color = accent === 'success' ? '#1a7f37' : accent === 'danger' ? '#cf222e' : accent === 'warning' ? '#bf8700' : undefined;
  return (
    <Card size="small" variant="borderless" style={{ height: '100%' }}>
      <Statistic
        title={title}
        value={money ? fmtMoney(value, currency, { compact: true }) : value}
        precision={money ? undefined : precision}
        suffix={suffix}
        prefix={prefix}
        valueStyle={{ color, fontSize: 24 }}
      />
      {trend !== undefined && (
        <Text type={trend >= 0 ? 'success' : 'danger'} style={{ fontSize: 12 }}>
          {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {fmtPct(Math.abs(trend))} vs prior
        </Text>
      )}
    </Card>
  );
}

export function GapHeadline({ label, value, currency = 'USD', sub }: { label: string; value: number; currency?: 'USD' | 'INR' | 'GBP' | 'CAD'; sub?: string }) {
  const positive = value >= 0;
  return (
    <Card style={{ background: positive ? '#e6f4ea' : '#fde7e9', borderColor: positive ? '#1a7f37' : '#cf222e' }}>
      <Text type="secondary">{label}</Text>
      <Title level={1} style={{ margin: '4px 0', color: positive ? '#1a7f37' : '#cf222e' }}>
        {positive ? '+' : ''}{fmtMoney(value, currency, { compact: true })}
      </Title>
      {sub && <Text type="secondary">{sub}</Text>}
    </Card>
  );
}

export function ConfidenceBand({ point, low, high, unit = 'SP' }: { point: number; low: number; high: number; unit?: string }) {
  return (
    <Space direction="vertical" size={2} style={{ width: '100%' }}>
      <Text strong style={{ fontSize: 20 }}>{point} {unit}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>confidence band: {low}–{high} {unit}</Text>
      <Progress percent={100} success={{ percent: ((point - low) / (high - low)) * 100 }} showInfo={false} size="small" />
    </Space>
  );
}

export function DriverList({ drivers }: { drivers: Array<{ label: string; weight: number }> }) {
  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      {drivers.map((d) => (
        <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ fontSize: 12 }}>{d.label}</Text>
          <Progress percent={Math.round(d.weight * 100)} size="small" style={{ width: 90 }} />
        </div>
      ))}
    </Space>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <Empty description={text} style={{ margin: '40px 0' }} />;
}
