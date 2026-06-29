import { motion } from 'framer-motion';
import { cn } from '../lib/cn';

/**
 * A vertical (horizontal on mobile) tab rail with a sliding active indicator. `tabs` is an array of
 * { id, label, desc?, icon? }. The active pill animates between tabs via a shared `layoutId`.
 */
export function TabRail({ tabs, value, onChange, layoutId = 'tabActive', className }) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0', className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex shrink-0 items-center gap-3 rounded-card px-3 py-3 text-left transition-colors lg:w-full',
              active ? 'text-accent' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-card ring-1 ring-accent/30"
                style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            ) : null}
            {Icon ? (
              <span
                className={cn('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-btn transition-colors', active ? 'text-accent' : 'bg-muted text-muted-foreground')}
                style={active ? { backgroundColor: 'rgba(var(--color-accent-rgb), 0.16)' } : undefined}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
            ) : null}
            <span className="relative z-10 min-w-0">
              <span className="block text-sm font-semibold leading-tight">{tab.label}</span>
              {tab.desc ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{tab.desc}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TabRail;
