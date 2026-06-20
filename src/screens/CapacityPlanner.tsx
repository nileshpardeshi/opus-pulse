import { useState, useMemo } from 'react';
import { Row, Col, Card, Select, Slider, Form, Statistic, Typography, Table } from 'antd';
import { useStore } from '../store';
import { PageHeader, ConfidenceBand } from '../components/common';
import { ComparisonBar } from '../components/charts';
import { referenceVelocity, availableDays, predictedCapacity, rampFactor, timelineSprints } from '../engines/capacity';

const { Text } = Typography;

export default function CapacityPlanner() {
  const { projects, employees, velocityRecords, features, teams, config } = useStore();
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === 'prj_token')?.id ?? projects[0]?.id);
  const project = projects.find((p) => p.id === projectId)!;
  const teamEmps = employees.filter((e) => e.teamId === project.teamId && e.status === 'active');
  const teamVel = velocityRecords.filter((v) => v.teamId === project.teamId);

  const [focus, setFocus] = useState(Math.round(config.focusFactor * 100));
  const [ceremony, setCeremony] = useState(1);
  const [leaves, setLeaves] = useState(1);

  const ref = useMemo(() => referenceVelocity(teamVel, 6), [teamVel]);
  const avail = availableDays({ sprintWorkingDays: 10, leaves, holidays: 0, ceremonyOverheadDays: ceremony });
  const ramp = rampFactor(teamEmps);
  const band = useMemo(() => predictedCapacity(ref.spPerDay, teamEmps.length, avail, focus / 100, ramp), [ref.spPerDay, teamEmps.length, avail, focus, ramp]);

  const projFeatures = features.filter((f) => f.projectId === projectId);
  const [featureId, setFeatureId] = useState(projFeatures[0]?.id);
  const feature = projFeatures.find((f) => f.id === featureId) ?? projFeatures[0];
  const sprints = feature ? timelineSprints(feature.sizeStoryPoints, band.point) : 0;

  const history = teamVel.slice(-6).map((v, i) => ({ sprint: `S${i + 1}`, 'Completed SP': v.completedPoints }));

  return (
    <>
      <PageHeader title="Capacity planner" subtitle="Evidence-based capacity from real velocity & available days (Module E)" />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={6}>
          <Card size="small" title="Inputs">
            <Form layout="vertical" size="small">
              <Form.Item label="Project"><Select value={projectId} onChange={(v) => { setProjectId(v); }} options={projects.map((p) => ({ value: p.id, label: p.name }))} /></Form.Item>
              <Form.Item label={`Focus factor: ${(focus / 100).toFixed(2)}`}><Slider min={50} max={100} value={focus} onChange={setFocus} /></Form.Item>
              <Form.Item label={`Ceremony overhead: ${ceremony} day(s)`}><Slider min={0} max={3} value={ceremony} onChange={setCeremony} /></Form.Item>
              <Form.Item label={`Leaves this sprint: ${leaves} day(s)`}><Slider min={0} max={5} value={leaves} onChange={setLeaves} /></Form.Item>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={18}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Team size (active)" value={teamEmps.length} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Reference velocity" value={Math.round(ref.meanSp)} suffix="SP" /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Available days" value={avail} suffix="/ sprint" /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Ramp factor" value={ramp} precision={2} /></Card></Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={10}><Card size="small" title="Predicted team velocity (confidence band)"><ConfidenceBand point={band.point} low={band.low} high={band.high} /><Text type="secondary" style={{ fontSize: 11 }}>Never a single point estimate (AC-E2).</Text></Card></Col>
            <Col xs={24} md={14}><Card size="small" title="Feature delivery timeline">
              <Form layout="vertical" size="small"><Form.Item label="Feature"><Select value={featureId} onChange={setFeatureId} options={projFeatures.map((f) => ({ value: f.id, label: `${f.name} (${f.sizeStoryPoints} SP)` }))} /></Form.Item></Form>
              {feature && <Statistic title={`${feature.sizeStoryPoints} SP at ${band.point} SP/sprint`} value={sprints} suffix={`sprints (~${(sprints * 2).toFixed(0)} weeks)`} />}
            </Card></Col>
          </Row>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}><Card size="small" title="Velocity history (last 6 sprints)"><ComparisonBar data={history} xKey="sprint" series={[{ key: 'Completed SP', name: 'Completed SP' }]} height={240} /></Card></Col>
        <Col xs={24} lg={10}><Card size="small" title="Per-resource contribution">
          <Table size="small" pagination={false} dataSource={teamEmps.map((e) => ({ key: e.id, name: e.name, role: e.role, sp: Math.round(band.point / teamEmps.length) }))} columns={[{ title: 'Resource', dataIndex: 'name' }, { title: 'Role', dataIndex: 'role' }, { title: 'Est. SP/sprint', dataIndex: 'sp', align: 'right' }]} />
        </Card></Col>
      </Row>
    </>
  );
}
