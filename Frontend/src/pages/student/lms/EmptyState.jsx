import { Inbox } from 'lucide-react';

/** Reusable, on-theme empty state — an accent-tinted icon disc with a title and message. */
export default function EmptyState({ icon: Icon = Inbox, title, message, compact = false, action }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-14'}`}>
      <span
        className="mb-3 grid place-items-center rounded-card"
        style={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)',
        }}
      >
        <Icon className={compact ? 'h-6 w-6' : 'h-8 w-8'} style={{ color: 'var(--color-accent)' }} />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
