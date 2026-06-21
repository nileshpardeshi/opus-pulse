import { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Tooltip, Modal, App } from 'antd';
import { SettingOutlined, DollarOutlined, SwapOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const NAV = [
  { key: '/', label: 'Configuration', icon: <SettingOutlined /> },
  { key: '/billing', label: 'Billing Simulator', icon: <DollarOutlined /> },
  { key: '/outcome', label: 'Outcome Simulator', icon: <SwapOutlined /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const resetDemo = useStore((s) => s.resetDemo);
  const { message } = App.useApp();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 16 }}>
        <Space size={10}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#1f6feb', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700 }}>OP</div>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Opus Pulse</Text>
          <Text style={{ color: '#8b949e', fontSize: 12 }}>TNM → Outcome Conversion Simulator</Text>
        </Space>
        <Tooltip title="Reset demo data to seed">
          <Button size="small" icon={<ReloadOutlined />} onClick={() => Modal.confirm({ title: 'Reset demo data?', content: 'Restores the seed accounts/projects and discards your edits.', onOk: () => { resetDemo(); message.success('Demo data reset'); } })}>Reset</Button>
        </Tooltip>
      </Header>
      <Layout>
        <Sider theme="dark" width={220} collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg">
          <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} style={{ borderRight: 0, marginTop: 8 }}
            items={NAV.map((n) => ({ key: n.key, icon: n.icon, label: <Link to={n.key}>{n.label}</Link> }))} />
        </Sider>
        <Content style={{ padding: 20, overflow: 'auto' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
