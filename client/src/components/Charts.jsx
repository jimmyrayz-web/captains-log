const CHART_HEIGHT = 180;
const TOP_PAD = 16;
const BOTTOM_PAD = 36;
const LEFT_PAD = 46;
const RIGHT_PAD = 16;
const PLOT_HEIGHT = CHART_HEIGHT - TOP_PAD - BOTTOM_PAD;

function niceRange(min, max) {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.1;
  return [Math.min(0, min - pad), max + pad];
}

function yFor(value, lo, hi) {
  if (hi === lo) return TOP_PAD + PLOT_HEIGHT / 2;
  return TOP_PAD + PLOT_HEIGHT * (1 - (value - lo) / (hi - lo));
}

export function LineChart({ data, pxPerPoint = 56, color = 'var(--teal)', unit = '' }) {
  if (!data || data.length === 0) return null;
  const width = Math.max(data.length * pxPerPoint, 220) + LEFT_PAD + RIGHT_PAD;
  const values = data.map((d) => d.value);
  const [lo, hi] = niceRange(Math.min(...values), Math.max(...values));

  const points = data.map((d, i) => {
    const x = LEFT_PAD + i * pxPerPoint + pxPerPoint / 2;
    const y = yFor(d.value, lo, hi);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const zeroY = yFor(0, lo, hi);

  return (
    <div className="chart-scroll">
      <svg width={width} height={CHART_HEIGHT} className="chart-svg" role="img">
        <line
          x1={LEFT_PAD}
          y1={zeroY}
          x2={width - RIGHT_PAD}
          y2={zeroY}
          className="chart-axis-line"
        />
        <text x={4} y={TOP_PAD + 4} className="chart-axis-label">
          {Math.round(hi * 10) / 10}
          {unit}
        </text>
        <text x={4} y={TOP_PAD + PLOT_HEIGHT} className="chart-axis-label">
          {Math.round(lo * 10) / 10}
          {unit}
        </text>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
            <text x={p.x} y={CHART_HEIGHT - 16} className="chart-x-label" textAnchor="middle">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BarChart({ data, pxPerBar = 48, color = 'var(--teal)', unit = '' }) {
  if (!data || data.length === 0) return null;
  const width = Math.max(data.length * pxPerBar, 220) + LEFT_PAD + RIGHT_PAD;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 0);
  const hi = max === 0 ? 1 : max * 1.1;
  const barWidth = pxPerBar * 0.6;
  const zeroY = TOP_PAD + PLOT_HEIGHT;

  return (
    <div className="chart-scroll">
      <svg width={width} height={CHART_HEIGHT} className="chart-svg" role="img">
        <line x1={LEFT_PAD} y1={zeroY} x2={width - RIGHT_PAD} y2={zeroY} className="chart-axis-line" />
        <text x={4} y={TOP_PAD + 4} className="chart-axis-label">
          {Math.round(max * 10) / 10}
          {unit}
        </text>
        <text x={4} y={zeroY} className="chart-axis-label">
          0
        </text>
        {data.map((d, i) => {
          const barHeight = (d.value / hi) * PLOT_HEIGHT;
          const x = LEFT_PAD + i * pxPerBar + (pxPerBar - barWidth) / 2;
          const y = zeroY - barHeight;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx="3" fill={color} />
              <text x={x + barWidth / 2} y={CHART_HEIGHT - 16} className="chart-x-label" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
