'use client';

type Point = { month: string; overallScore: number; interpretation: string };

export function TrendChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-slate)' }}>No data to display.</p>;
  }

  const width = 900;
  const height = 260;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const maxScore = 10;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = paddingLeft + (data.length > 1 ? i * stepX : chartWidth / 2);
    const y = paddingTop + chartHeight - (d.overallScore / maxScore) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => (i === 0 ? 'M ' + p.x + ' ' + p.y : 'L ' + p.x + ' ' + p.y)).join(' ');
  const gridLines = [0, 2, 4, 6, 8, 10];

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={'0 0 ' + width + ' ' + height} style={{ minWidth: 500 }}>
        {gridLines.map((g) => {
          const y = paddingTop + chartHeight - (g / maxScore) * chartHeight;
          return (
            <g key={g}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--color-line)" strokeWidth={1} />
              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize={11} fill="var(--color-slate)">{g}</text>
            </g>
          );
        })}
        <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="var(--color-primary)" />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-ink)">
              {p.overallScore.toFixed(2)}
            </text>
            <text x={p.x} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--color-slate)">
              {p.month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}