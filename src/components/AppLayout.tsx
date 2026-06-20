import { useMemo, useState } from 'react';
import { Layout, Menu, Select, Badge, Dropdown, Button, Avatar, Space, Typography, Tooltip, Modal, message } from 'antd';
import {
  DashboardOutlined, DollarOutlined, FundOutlined, RobotOutlined, TeamOutlined, TagsOutlined,
  SwapOutlined, BlockOutlined, ShopOutlined, FileTextOutlined, SettingOutlined, DiffOutlined,
  BankOutlined, BellOutlined, FunnelPlotOutlined, PieChartOutlined, CheckSquareOutlined,
  UserSwitchOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { CurrencyCode, RoleKey } from '../types';
import { useStore } from '../store';
import { ROLE_LIST, ROLES } from '../rbac/roles';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface NavItem { key: string; label: string; icon: React.ReactNode; cap?: keyof (typeof ROLES)['cdo']['can'] }

const NAV_GROUPS: Array<{ group: string; items: NavItem[] }> = [
  { group: 'Overview', items: [{ key: '/', label: 'Executive dashboard', icon: <DashboardOutlined /> }] },
  { group: 'Economics', items: [
    { key: '/billing', label: 'Billing & forecast', icon: <DollarOutlined /> },
    { key: '/margin', label: 'Margin detail', icon: <FundOutlined /> },
    { key: '/sp-economics', label: 'Story Point economics', icon: <TagsOutlined /> },
    { key: '/revenue', label: 'Revenue & WIP', icon: <BankOutlined /> },
    { key: '/utilization', label: 'Utilization & bench', icon: <PieChartOutlined /> },
  ] },
  { group: 'Intelligence', items: [
    { key: '/risk', label: 'Margin-risk (AI)', icon: <RobotOutlined /> },
    { key: '/alerts', label: 'Alerts', icon: <BellOutlined /> },
  ] },
  { group: 'Workbench', items: [
    { key: '/capacity', label: 'Capacity planner', icon: <TeamOutlined /> },
    { key: '/pricing', label: 'Outcome pricing', icon: <BlockOutlined /> },
    { key: '/comparison', label: 'Comparison workbench', icon: <SwapOutlined /> },
    { key: '/change-requests', label: 'Change requests', icon: <DiffOutlined /> },
  ] },
  { group: 'Commercial', items: [
    { key: '/pipeline', label: 'Deal pipeline', icon: <FunnelPlotOutlined /> },
    { key: '/approvals', label: 'Approvals', icon: <CheckSquareOutlined />, cap: 'approve' },
  ] },
  { group: 'Marketplace', items: [
    { key: '/marketplace', label: 'Delivery marketplace', icon: <ShopOutlined />, cap: 'marketplace' },
  ] },
  { group: 'Reports & Admin', items: [
    { key: '/reports', label: 'Reports', icon: <FileTextOutlined /> },
    { key: '/admin', label: 'Admin', icon: <SettingOutlined /> },
  ] },
];

const CURRENCIES: CurrencyCode[] = ['USD', 'INR', 'GBP', 'CAD'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { currentRole, setRole, config, setBaseCurrency, resetDemo, alerts, approvals } = useStore();
  const role = ROLES[currentRole];

  const unreadAlerts = useMemo(
    () => alerts.filter((a) => a.status === 'new' && (!a.requires || role.can[a.requires])).length,
    [alerts, role],
  );
  const pendingApprovals = useMemo(
    () => (role.can.approve ? approvals.filter((a) => a.status === 'pending').length : 0),
    [approvals, role],
  );

  const menuItems = NAV_GROUPS.map((g) => ({
    key: g.group,
    type: 'group' as const,
    label: g.group,
    children: g.items
      .filter((it) => !it.cap || role.can[it.cap])
      .map((it) => ({ key: it.key, icon: it.icon, label: <Link to={it.key}>{it.label}</Link> })),
  }));

  const roleMenuItems = ROLE_LIST.map((r) => ({ key: r.key, label: `${r.name}` }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingInline: 16 }}>
        <Space size={10}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#1f6feb', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700 }}>OP</div>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>Opus Pulse</Text>
          <Text style={{ color: '#8b949e', fontSize: 12 }}>Delivery Economics</Text>
        </Space>
        <Space size={12}>
          <Tooltip title="Base reporting currency">
            <Select size="small" value={config.baseCurrency} onChange={(v) => setBaseCurrency(v as CurrencyCode)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} style={{ width: 84 }} />
          </Tooltip>
          <Tooltip title="Alerts">
            <Badge count={unreadAlerts} size="small">
              <Button type="text" icon={<BellOutlined style={{ color: '#fff' }} />} onClick={() => navigate('/alerts')} />
            </Badge>
          </Tooltip>
          {role.can.approve && (
            <Tooltip title="Pending approvals">
              <Badge count={pendingApprovals} size="small">
                <Button type="text" icon={<CheckSquareOutlined style={{ color: '#fff' }} />} onClick={() => navigate('/approvals')} />
              </Badge>
            </Tooltip>
          )}
          <Dropdown
            menu={{ items: roleMenuItems, selectedKeys: [currentRole], onClick: ({ key }) => { setRole(key as RoleKey); message.success(`Viewing as ${ROLES[key as RoleKey].name}`); } }}
          >
            <Button type="text" style={{ color: '#fff' }} icon={<UserSwitchOutlined />}>
              <Space size={6}>
                <Avatar size={22} style={{ background: '#1f6feb' }}>{role.name[0]}</Avatar>
                {role.name}
              </Space>
            </Button>
          </Dropdown>
          <Tooltip title="Reset demo data to seed">
            <Button size="small" icon={<ReloadOutlined />} onClick={() => Modal.confirm({ title: 'Reset demo data?', content: 'This restores the seed dataset and discards your edits.', onOk: () => { resetDemo(); message.success('Demo data reset'); } })} />
          </Tooltip>
        </Space>
      </Header>
      <Layout>
        <Sider theme="dark" width={236} collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg">
          <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} style={{ borderRight: 0 }} />
        </Sider>
        <Content style={{ padding: 20, overflow: 'auto' }}>
          <div style={{ maxWidth: 1320, margin: '0 auto' }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
