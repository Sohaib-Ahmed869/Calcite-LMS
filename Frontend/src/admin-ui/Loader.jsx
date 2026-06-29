import { cn } from '../lib/cn';

/** A centred brand spinner with an optional label — used for page-level loading states. */
export function AdminLoader({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-3 py-16 text-muted-foreground', className)}>
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-accent" />
      {label ? <p className="text-sm font-medium">{label}</p> : null}
    </div>
  );
}

export default AdminLoader;
