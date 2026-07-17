export function GaugeCircle({ label, score, max = 10, color }: { label: string; score: number; max?: number; color: string }) {
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / max));
  const offset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-semibold mb-2" style={{ color }}>{label}</p>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="700" fill="var(--color-ink)">
          {score.toFixed(1)}/{max}
        </text>
      </svg>
    </div>
  );
}