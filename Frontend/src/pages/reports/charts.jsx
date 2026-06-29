import { motion } from 'framer-motion';

/** Circular progress ring with a centred % and a label beside it. */
export function RingStat({ value = 0, size = 88, stroke = 9, color = 'var(--color-accent)', label, sublabel }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-lg font-bold text-foreground">{pct}%</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sublabel ? <p className="text-xs text-muted-foreground">{sublabel}</p> : null}
      </div>
    </div>
  );
}

/** Donut chart with a legend. `data` = [{ label, value, color }]. */
export function Donut({ data = [], size = 168, thickness = 26, centerLabel }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={thickness} />
          {total > 0 &&
            data.map((d, i) => {
              const len = ((d.value || 0) / total) * circ;
              const seg = (
                <motion.circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-acc}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                >
                  <title>{d.label}: {d.value}</title>
                </motion.circle>
              );
              acc += len;
              return seg;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{total}</p>
            {centerLabel ? <p className="text-[11px] text-muted-foreground">{centerLabel}</p> : null}
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="flex-1 truncate text-muted-foreground">{d.label}</span>
            <span className="tabular-nums font-semibold text-foreground">{d.value}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{total ? Math.round(((d.value || 0) / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Grouped monthly column chart for two series (enrolled vs completed). */
export function TrendBars({ data = [], height = 170 }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.enrolled || 0, d.completed || 0)));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 items-end justify-center gap-[3px]">
            <motion.div
              title={`${d.label}: ${d.enrolled} enrolled`}
              className="w-1/2 max-w-[13px] origin-bottom rounded-t bg-accent"
              style={{ height: `${((d.enrolled || 0) / max) * 100}%`, minHeight: d.enrolled ? 3 : 0 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.03, duration: 0.5, ease: 'easeOut' }}
            />
            <motion.div
              title={`${d.label}: ${d.completed} completed`}
              className="w-1/2 max-w-[13px] origin-bottom rounded-t"
              style={{ height: `${((d.completed || 0) / max) * 100}%`, minHeight: d.completed ? 3 : 0, backgroundColor: 'var(--color-success)' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.03 + 0.06, duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-muted-foreground">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal labelled bar (used for the "top courses" completion rates). */
export function StatBar({ label, value, max, suffix = '', color = 'var(--color-accent)', meta }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{meta ?? `${value}${suffix}`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
      </div>
    </div>
  );
}
