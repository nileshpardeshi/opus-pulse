import { useMemo } from 'react';
import { Row, Col, Card, Tag, Typography, Select, Space, Statistic } from 'antd';
import { useStore } from '../store';
import { clientName } from '../selectors';
import { PageHeader, KpiCard } from '../components/common';
import { DELIVERY_MODEL_LABEL, type DealStage } from '../types';
import { MODEL_COLORS } from '../theme';
import { fmtMoney, fmtPct } from '../utils';

const { Text } = Typography;
const STAGES: DealStage[] = ['draft', 'submitted', 'negotiation', 'won', 'lost'];
const STAGE_LABEL: Record<DealStage, string> = { draft: 'Draft', submitted: 'Submitted', negotiation: 'Negotiation', won: 'Won', lost: 'Lost', withdrawn: 'Withdrawn' };

export default function DealPipeline() {
  const { deals, clients, setDealStage, config } = useStore();

  const closed = deals.filter((d) => d.stage === 'won' || d.stage === 'lost');
  const won = deals.filter((d) => d.stage === 'won');
  const winRate = closed.length ? won.length / closed.length : 0;
  const avgMargin = won.length ? won.reduce((s, d) => s + d.marginPct, 0) / won.length : 0;

  const byStage = useMemo(() => STAGES.map((st) => ({ stage: st, items: deals.filter((d) => d.stage === st) })), [deals]);

  return (
    <>
      <PageHeader title="Deal pipeline" subtitle="Proposals through win/loss — feeds the win-probability model (Module N)" />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><KpiCard title="Open deals" value={deals.filter((d) => !['won', 'lost', 'withdrawn'].includes(d.stage)).length} /></Col>
        <Col xs={12} md={6}><KpiCard title="Win rate" value={winRate * 100} precision={0} suffix="%" accent="success" /></Col>
        <Col xs={12} md={6}><KpiCard title="Avg won margin" value={avgMargin * 100} precision={0} suffix="%" /></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Closed deals" value={closed.length} /></Card></Col>
      </Row>

      <Row gutter={12} style={{ marginTop: 16 }} wrap>
        {byStage.map((col) => (
          <Col key={col.stage} flex="1 1 200px" style={{ minWidth: 200 }}>
            <Card size="small" title={<Space>{STAGE_LABEL[col.stage]}<Tag>{col.items.length}</Tag></Space>} styles={{ body: { background: '#f4f6f9', minHeight: 240 } }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {col.items.map((d) => (
                  <Card key={d.id} size="small" variant="borderless" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <Text strong style={{ fontSize: 12 }}>{d.name}</Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>{clientName(clients, d.clientId)}</Text></div>
                    <div style={{ margin: '4px 0' }}><Tag color={MODEL_COLORS[d.modelType]} style={{ fontSize: 10 }}>{DELIVERY_MODEL_LABEL[d.modelType]}</Tag></div>
                    <Space size={8} wrap>
                      <Text style={{ fontSize: 12 }}>{fmtMoney(d.price.amount, d.price.currency, { compact: true })}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{fmtPct(d.marginPct, 0)}</Text>
                      <Tag color="purple" style={{ fontSize: 10 }}>win {d.winProbability}%</Tag>
                    </Space>
                    {d.winLossReason && <div><Text type="secondary" style={{ fontSize: 10 }}>{d.winLossReason}</Text></div>}
                    <Select size="small" value={d.stage} style={{ width: '100%', marginTop: 6 }} onChange={(v) => setDealStage(d.id, v, v === 'lost' ? 'Reason captured' : undefined)} options={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))} />
                  </Card>
                ))}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
