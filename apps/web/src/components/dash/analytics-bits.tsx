import Link from 'next/link';
import type { AnalyticsMetric } from '@/lib/types';

const num = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K` : n.toLocaleString('en-IN'));

/** A line of up to ~90 points, no axes: the shape of the period at a glance. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 120;
  const H = 36;
  const max = Math.max(1, ...values);
  const x = (i: number) => 4 + (values.length > 1 ? (i * (W - 8)) / (values.length - 1) : 0);
  const y = (v: number) => 4 + (H - 8) * (1 - v / max);
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg className="viz-spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {last >= 0 && <circle cx={x(last)} cy={y(values[last])} r="4" fill={color} stroke="var(--viz-surface)" strokeWidth="2" />}
    </svg>
  );
}

/** Direction x whether up is good. The arrow and the words carry it, so colour is never the only cue. */
function Delta({ m, days }: { m: AnalyticsMetric; days: number }) {
  if (m.changePct === null) return <p className="viz-delta flat">{m.value > 0 ? `No views in the previous ${days} days` : 'No views yet'}</p>;
  if (m.changePct === 0) return <p className="viz-delta flat">No change vs previous {days} days</p>;
  const up = m.changePct > 0;
  return (
    <p className={`viz-delta ${up ? 'up' : 'down'}`}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {Math.abs(m.changePct)}% {up ? 'more' : 'fewer'} than the previous {days} days
    </p>
  );
}

export function StatTile({ label, metric, series, color, days }: { label: string; metric: AnalyticsMetric; series: number[]; color: string; days: number }) {
  return (
    <section className="viz-tile panel" aria-label={label}>
      <h3>{label}</h3>
      <p className="viz-value">{num(metric.value)}</p>
      <Delta m={metric} days={days} />
      <Sparkline values={series} color={color} />
    </section>
  );
}

/** One hue, largest first, each bar growing from the left edge with its value at the tip. */
export function RankedBars({ rows }: { rows: { id: string; name: string; href: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="viz-ranked">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="viz-ranked-head">
            <Link href={r.href}>{r.name}</Link>
            <b>{num(r.value)}</b>
          </div>
          <div className="viz-track"><div className="viz-bar" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ol>
  );
}

/** Stages in order, one hue stepping darker; every stage bar is measured against the first. */
export function StageBars({ stages }: { stages: { label: string; hint: string; value: number }[] }) {
  const max = Math.max(1, stages[0]?.value ?? 1);
  return (
    <ol className="viz-stages">
      {stages.map((s, i) => (
        <li key={s.label}>
          <div className="viz-ranked-head">
            <span>{s.label} <small>{s.hint}</small></span>
            <b>{num(s.value)}</b>
          </div>
          <div className="viz-track">
            <div className="viz-bar" style={{ width: `${s.value === 0 ? 0 : Math.max(2, (s.value / max) * 100)}%`, background: `var(--viz-step-${i + 1})` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
