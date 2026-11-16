'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { AnalyticsDay } from '@/lib/types';

/** Fixed series order and colours: the colour follows the series, never its rank. */
const SERIES = [
  { key: 'productViews', label: 'Product views', color: 'var(--viz-1)' },
  { key: 'profileViews', label: 'Supplier page views', color: 'var(--viz-2)' },
  { key: 'siteViews', label: 'Website views', color: 'var(--viz-3)' },
] as const;

/** Width used before the real one is measured (and on the server). */
const DEFAULT_W = 720;
const H = 260;
const L = 44;
const R = 16;
const T = 14;
const B = 30;

const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const num = (n: number) => n.toLocaleString('en-IN');

/** Round axis ticks (1, 2, 5 x 10^k): 0, 5, 10, 15 rather than 0, 4.3, 8.6. Views are whole numbers. */
function niceTicks(max: number): number[] {
  const target = Math.max(max, 4);
  const raw = target / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw);
  const top = Math.ceil(target / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top; v += step) out.push(v);
  return out;
}

export function ViewsChart({ series }: { series: AnalyticsDay[] }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the real width so axis text keeps its size on a phone instead of shrinking with the picture.
  const plot = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const measure = () => setW(Math.max(280, Math.round(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = series.length;
  const total = (key: (typeof SERIES)[number]['key']) => series.reduce((s, d) => s + d[key], 0);
  const max = Math.max(0, ...series.flatMap((d) => SERIES.map((s) => d[s.key])));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];

  const step = n > 1 ? (W - L - R) / (n - 1) : 0;
  const x = (i: number) => L + i * step;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const path = (key: (typeof SERIES)[number]['key']) => series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ');

  // About five evenly spaced date labels (three on a narrow screen), always including the first and the last day.
  const every = Math.max(1, Math.ceil((n - 1) / (W < 520 ? 2 : 4)));
  const labelled = series.map((_, i) => i).filter((i) => i % every === 0 || i === n - 1).filter((i, k, a) => k === a.length - 1 || a[a.length - 1] - i >= every / 2);

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.min(n - 1, Math.max(0, Math.round((px - L) / (step || 1)))));
  };
  const keys = (e: React.KeyboardEvent) => {
    const at = hover ?? n - 1;
    const next = e.key === 'ArrowLeft' ? at - 1 : e.key === 'ArrowRight' ? at + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (e.key === 'Escape') setHover(null);
    if (next === null) return;
    e.preventDefault();
    setHover(Math.min(n - 1, Math.max(0, next)));
  };

  const d = hover === null ? null : series[hover];
  const announce = d ? `${dayLabel(d.day)}: ${SERIES.map((s) => `${s.label} ${d[s.key]}`).join(', ')}` : '';

  return (
    <figure className="viz-chart">
      <ul className="viz-legend" aria-label="Series">
        {SERIES.map((s) => (
          <li key={s.key}>
            <svg width="18" height="8" aria-hidden="true"><line x1="1" y1="4" x2="17" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" /></svg>
            <span>{s.label}</span>
            <b>{num(total(s.key))}</b>
          </li>
        ))}
      </ul>

      <div
        ref={plot}
        className="viz-plot"
        tabIndex={0}
        role="group"
        aria-label="Views per day. Use the left and right arrow keys to read each day."
        onKeyDown={keys}
        onFocus={() => setHover((h) => h ?? n - 1)}
        onBlur={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} onPointerMove={move} onPointerLeave={() => setHover(null)} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-base' : 'viz-grid'} />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="viz-tick">{num(t)}</text>
            </g>
          ))}
          {labelled.map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="viz-tick">{dayLabel(series[i].day)}</text>
          ))}

          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="viz-cross" />}
          {SERIES.map((s) => (
            <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {/* End dots (and the hovered day's dots) carry a surface ring so they stay legible where lines cross. */}
          {SERIES.map((s) => {
            const i = hover ?? n - 1;
            return <circle key={s.key} cx={x(i)} cy={y(series[i][s.key])} r="4" fill={s.color} stroke="var(--viz-surface)" strokeWidth="2" />;
          })}
        </svg>

        {d && hover !== null && (
          <div className="viz-tip" style={{ left: `${(x(hover) / W) * 100}%`, transform: hover > n * 0.55 ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)' }}>
            <div className="viz-tip-day">{dayLabel(d.day)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="viz-tip-row">
                <svg width="14" height="8" aria-hidden="true"><line x1="1" y1="4" x2="13" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" /></svg>
                <b>{num(d[s.key])}</b>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="sr-only" aria-live="polite">{announce}</div>
      </div>

      <details className="viz-table" id={`${id}-table`}>
        <summary>View as table</summary>
        <div className="viz-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Day</th>
                {SERIES.map((s) => <th key={s.key} scope="col">{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((row) => (
                <tr key={row.day}>
                  <th scope="row">{dayLabel(row.day)}</th>
                  {SERIES.map((s) => <td key={s.key}>{num(row[s.key])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
