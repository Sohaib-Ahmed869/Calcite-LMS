import { useEffect, useRef, useState } from 'react';
import { ChevronDown, GraduationCap, Check } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { cn } from '../../lib/cn';

/**
 * For parents/guardians (and students with multiple profiles), a compact picker to choose the
 * "active" student the portal is scoped to. Admins/staff have nothing to switch, so it renders
 * nothing for them — keeping the top bar clean.
 */
const SWITCHER_ROLES = new Set(['parent', 'guardian', 'student']);

// Demo roster — replace with the guardian's real children (e.g. GET /me/students).
const DEMO_STUDENTS = [
  { id: 's1', name: 'Aanya Kapoor', grade: 'Grade 9' },
  { id: 's2', name: 'Vihaan Kapoor', grade: 'Grade 6' },
];

export function StudentSwitcher() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(DEMO_STUDENTS[0]);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!SWITCHER_ROLES.has(user?.role)) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-btn bg-white/10 px-2.5 py-1.5 text-left text-white transition-colors hover:bg-white/15"
      >
        <GraduationCap className="h-4 w-4 shrink-0 text-white/70" />
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block max-w-[120px] truncate text-[12px] font-semibold">{active.name}</span>
          <span className="block text-[10px] text-white/50">{active.grade}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/50 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-card border border-border bg-card text-foreground shadow-card">
          <p className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Viewing</p>
          <ul className="py-1">
            {DEMO_STUDENTS.map((s) => {
              const isActive = s.id === active.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActive(s);
                      setOpen(false);
                    }}
                    className={cn('flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted', isActive && 'text-accent')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.grade}</span>
                    </span>
                    {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default StudentSwitcher;
