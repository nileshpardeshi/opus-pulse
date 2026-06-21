import React from 'react';
import { Card, Statistic, Tag, Typography, Empty } from 'antd';
import { RobotOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import type { Currency } from '../types';
import { fmtMoney, fmtPct } from '../utils';

const { Text, Title } = Typography;

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

export function AiBadge({ text = 'AI advisory (rules-based)' }: { text?: string }) {
  return <Tag icon={<RobotOutlined />} color="purple" style={{ fontWeight: 500 }}>{text}</Tag>;
}

export function KpiCard({
  title, value, suffix, precision, trend, accent, money, currency = 'USD', compact = true,
}: {
  title: string; value: number; suffix?: string; precision?: number; trend?: number;
  accent?: 'success' | 'danger' | 'warning'; money?: boolean; currency?: Currency; compact?: boolean;
}) {
  const color = accent === 'success' ? '#1a7f37' : accent === 'danger' ? '#cf222e' : accent === 'warning' ? '#bf8700' : undefined;
  return (
    <Card size="small" variant="borderless" style={{ height: '100%' }}>
      <Statistic
        title={title}
        value={money ? fmtMoney(value, currency, { compact }) : value}
        precision={money ? undefined : precision}
        suffix={suffix}
        valueStyle={{ color, fontSize: 22 }}
      />
      {trend !== undefined && (
        <Text type={trend >= 0 ? 'success' : 'danger'} style={{ fontSize: 12 }}>
          {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {fmtPct(Math.abs(trend))} vs TNM
        </Text>
      )}
    </Card>
  );
}

export function GapHeadline({ label, value, currency = 'USD', sub }: { label: string; value: number; currency?: Currency; sub?: string }) {
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

export function EmptyState({ text }: { text: string }) {
  return <Empty description={text} style={{ margin: '40px 0' }} />;
}
