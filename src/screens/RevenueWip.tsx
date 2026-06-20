import { Row, Col, Card, Table, Tag, Button, Statistic, Typography, App } from 'antd';
import { useStore } from '../store';
import { clientName } from '../selectors';
import { PageHeader, KpiCard, useCanSee } from '../components/common';
import { ComparisonBar } from '../components/charts';
import { summarizeRevRec, acceptanceAgeing } from '../engines/revenueRecognition';
import { convert, fmtMoney } from '../utils';
import { DELIVERY_MODEL_LABEL } from '../types';

const { Text } = Typography;
const ACCEPT_COLOR: Record<string, string> = { pending: 'default', 'in-progress': 'processing', delivered: 'warning', accepted: 'success' };

export default function RevenueWip() {
  const { projects, sows, clients, revenueRecognition, milestones, features, acceptMilestone, config } = useStore();
  const { message } = App.useApp();
  const canMargin = useCanSee('margin');
  const cur = config.baseCurrency;

  if (!canMargin) return (<><PageHeader title="Revenue & WIP" /><Card><Text type="warning">Revenue recognition is restricted for your role (Finance / CDO).</Text></Card></>);

  const totals = summarizeRevRec(revenueRecognition, cur);
  const ageing = acceptanceAgeing(milestones);

  const byProject = projects.map((p) => {
    const recs = revenueRecognition.filter((r) => r.projectId === p.id);
    const sum = summarizeRevRec(recs, cur);
    const sow = sows.find((s) => s.id === p.sowId)!;
    return { key: p.id, name: p.name, client: clientName(clients, p.clientId), model: sow.modelType, ...sum };
  });

  const bars = byProject.map((p) => ({ name: p.name.split(' ')[0], Recognized: Math.round(p.recognized), Billed: Math.round(p.billed), WIP: Math.round(p.wipUnbilled) }));

  return (
    <>
      <PageHeader title="Revenue & WIP" subtitle="Recognized vs billed vs WIP/deferred per delivery model (Module L)" />
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><KpiCard title="Recognized" value={totals.recognized} money currency={cur} accent="success" /></Col>
        <Col xs={12} md={6}><KpiCard title="Billed" value={totals.billed} money currency={cur} /></Col>
        <Col xs={12} md={6}><KpiCard title="WIP / unbilled" value={totals.wipUnbilled} money currency={cur} accent="warning" /></Col>
        <Col xs={12} md={6}><KpiCard title="Deferred" value={totals.deferred} money currency={cur} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}><Card size="small" title="Recognized / billed / WIP by project"><ComparisonBar data={bars} xKey="name" series={[{ key: 'Recognized', name: 'Recognized', color: '#1a7f37' }, { key: 'Billed', name: 'Billed', color: '#1f6feb' }, { key: 'WIP', name: 'WIP', color: '#bf8700' }]} /></Card></Col>
        <Col xs={24} lg={10}><Card size="small" title="Rev-rec policy by project">
          <Table size="small" pagination={false} dataSource={byProject} columns={[
            { title: 'Project', dataIndex: 'name', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
            { title: 'Model', dataIndex: 'model', render: (m: keyof typeof DELIVERY_MODEL_LABEL) => <Tag>{DELIVERY_MODEL_LABEL[m]}</Tag> },
          ]} />
        </Card></Col>
      </Row>

      <Card size="small" title="Milestone acceptance ageing" style={{ marginTop: 16 }}>
        <Table size="small" pagination={false} dataSource={ageing.map((a) => ({ key: a.milestone.id, ...a, name: a.milestone.name, feature: features.find((f) => f.id === a.milestone.featureId)?.name, price: a.milestone.price, status: a.milestone.acceptanceStatus }))} columns={[
          { title: 'Milestone', dataIndex: 'name' },
          { title: 'Feature', dataIndex: 'feature' },
          { title: 'Price', key: 'price', align: 'right', render: (_: unknown, r) => fmtMoney(convert(r.price.amount, r.price.currency, cur), cur, { compact: true }) },
          { title: 'Due', dataIndex: ['milestone', 'dueDate'] },
          { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={ACCEPT_COLOR[s]}>{s}</Tag> },
          { title: 'Cash-flow risk', dataIndex: 'cashFlowRisk', render: (v: boolean) => v ? <Tag color="red">at risk</Tag> : <Tag color="green">ok</Tag> },
          { title: '', key: 'act', render: (_: unknown, r) => r.status !== 'accepted' ? <Button size="small" type="primary" onClick={() => { acceptMilestone(r.milestone.id); message.success('Milestone accepted → revenue recognized'); }}>Accept</Button> : <Tag color="success">accepted</Tag> },
        ]} />
      </Card>
    </>
  );
}
