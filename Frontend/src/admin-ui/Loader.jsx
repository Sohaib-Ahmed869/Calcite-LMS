import { GraduationCap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/cn';
import { iconForPath } from '../app/nav';

const SIZES = {
  sm: { box: 'h-10 w-10', ring: 3, icon: 'h-4 w-4' },
  md: { box: 'h-14 w-14', ring: 4, icon: 'h-6 w-6' },
  lg: { box: 'h-20 w-20', ring: 5, icon: 'h-9 w-9' },
};

/**
 * Brand spinner — a spinning conic-gradient "comet" ring over a faint track, wrapped in a soft
 * accent halo with a gently pulsing mark at its centre. Pure CSS (no framer-motion) so it's cheap
 * enough to show during the very first paint. Colours follow the live brand tokens.
 */
export function BrandSpinner({ size = 'md', icon: Icon = GraduationCap, className }) {
  const s = SIZES[size] || SIZES.md;
  const t = `${s.ring}px`;
  const ring = `radial-gradient(farthest-side, #0000 calc(100% - ${t}), #000 calc(100% - ${t}))`;
  return (
    <span className={cn('relative inline-grid place-items-center', s.box, className)}>
      {/* soft brand halo */}
      <span aria-hidden className="absolute -inset-3 rounded-full blur-2xl" style={{ background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)' }} />
      {/* faint full track */}
      <span aria-hidden className="absolute inset-0 rounded-full" style={{ border: `${t} solid color-mix(in srgb, var(--color-accent) 13%, transparent)` }} />
      {/* spinning gradient arc */}
      <span
        aria-hidden
        className="absolute inset-0 animate-spin rounded-full [animation-duration:0.9s]"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, var(--color-accent) 78%, var(--color-primary) 100%)',
          WebkitMask: ring,
          mask: ring,
        }}
      />
      {/* pulsing brand mark */}
      {Icon ? <Icon className={cn('relative z-10 animate-pulse text-accent', s.icon)} /> : null}
    </span>
  );
}

/**
 * Centred page/section loader with an optional label. Drop-in for the previous API
 * (`{ label, className }`); `size` and `fullScreen` are new opt-ins.
 */
export function AdminLoader({ label = 'Loading…', size = 'md', fullScreen = false, icon, className }) {
  const { pathname } = useLocation();
  // Match the spinner mark to the open tab (Courses → book, Students → people, Reports → chart…),
  // unless the caller passed an explicit icon.
  const resolvedIcon = icon || iconForPath(pathname);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex flex-col items-center justify-center gap-4 text-muted-foreground',
        fullScreen ? 'h-screen w-screen bg-background' : 'min-h-[80vh] w-full py-16',
        className,
      )}
    >
      <BrandSpinner size={size} icon={resolvedIcon} />
      {label ? <p className="animate-pulse text-sm font-medium tracking-tight">{label}</p> : null}
    </div>
  );
}

export default AdminLoader;
