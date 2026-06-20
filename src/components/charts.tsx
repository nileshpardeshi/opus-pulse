import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ComposedChart, Area,
} from 'recharts';
import { CHART_COLORS } from '../theme';

interface Series { key: string; name: string; color?: string }

export function TrendChart({
  data, xKey, series, height = 260, floorPct,
}: { data: Array<Record<string, number | string>>; xKey: string; series: Series[]; height?: number; floorPct?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey={xKey} fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        {floorPct !== undefined && <ReferenceLine y={floorPct} stroke="#cf222e" strokeDasharray="4 4" label={{ value: 'floor', fontSize: 11, fill: '#cf222e' }} />}
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ComparisonBar({
  data, xKey, series, height = 280,
}: { data: Array<Record<string, number | string>>; xKey: string; series: Series[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey={xKey} fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data, height = 240,
}: { data: Array<{ name: string; value: number; color?: string }>; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={d.name} fill={d.color ?? CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Waterfall-style margin bridge using a stacked invisible base bar. */
export function MarginBridge({
  data, height = 260,
}: { data: Array<{ name: string; base: number; delta: number; fill: string }>; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Bar dataKey="base" stackId="a" fill="transparent" />
        <Bar dataKey="delta" stackId="a" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function AreaTrend({
  data, xKey, series, height = 240,
}: { data: Array<Record<string, number | string>>; xKey: string; series: Series[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey={xKey} fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.15} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
