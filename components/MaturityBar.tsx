export function MaturityBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color =
    score < max * 0.4 ? 'var(--color-danger)' :
    score < max * 0.6 ? 'var(--color-warning)' :
    score < max * 0.8 ? 'var(--color-primary)' :
    'var(--color-success)';

  return (
    <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--color-line)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}