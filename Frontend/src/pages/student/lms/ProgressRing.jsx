/**
 * A token-themed circular progress ring. Track is `--color-muted`, arc is `--color-accent`
 * (so it re-themes with the tenant brand). Centre shows the percentage and an optional label.
 */
export default function ProgressRing({
  value = 0,
  size = 72,
  stroke = 6,
  label,
  showValue = true,
  decimals = 0,
  children,
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="text-muted" stroke="currentColor" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="var(--color-accent)"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        {children ?? (
          <>
            {label ? <span className="text-[9px] font-medium text-muted-foreground">{label}</span> : null}
            {showValue ? (
              <span className="text-sm font-bold tabular-nums text-foreground">{pct.toFixed(decimals)}%</span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
