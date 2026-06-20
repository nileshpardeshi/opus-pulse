import { Row, Col, Card, Button, Tag, Typography, Space, App } from 'antd';
import { DownloadOutlined, GlobalOutlined, LockOutlined } from '@ant-design/icons';
import { useStore } from '../store';
import { PageHeader } from '../components/common';
import { ROLES } from '../rbac/roles';
import { REPORTS } from '../reports';

const { Text, Paragraph } = Typography;

export default function Reports() {
  const state = useStore();
  const { message } = App.useApp();
  const role = ROLES[state.currentRole];

  return (
    <>
      <PageHeader title="Reports" subtitle="RBAC-filtered, real PDF / Excel / PPT export (Module H)" />
      <Row gutter={[16, 16]}>
        {REPORTS.map((r) => {
          const allowed = !r.requires || role.can[r.requires];
          return (
            <Col xs={24} md={12} lg={8} key={r.key}>
              <Card size="small" title={<Space>{r.audience === 'External' ? <GlobalOutlined /> : <LockOutlined />}{r.title}</Space>} extra={<Tag color={r.audience === 'External' ? 'green' : 'blue'}>{r.audience}</Tag>} style={{ height: '100%' }}>
                <Paragraph type="secondary" style={{ fontSize: 12, minHeight: 48 }}>{r.note}</Paragraph>
                {allowed ? (
                  <Space>
                    {r.formats.map((f) => (
                      <Button key={f.label} icon={<DownloadOutlined />} onClick={() => { f.run(state); message.success(`${r.title} (${f.label}) generated`); }}>{f.label}</Button>
                    ))}
                  </Space>
                ) : (
                  <Tag icon={<LockOutlined />}>Restricted for your role (requires {r.requires})</Tag>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
      <Card size="small" style={{ marginTop: 16 }}>
        <Text type="secondary">The client proposal pack is provably free of cost, margin, and marketplace data (FR-J5 / AC-H2 / AC-J3). Internal reports respect the active role's capabilities.</Text>
      </Card>
    </>
  );
}
