import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, Megaphone, UserPlus } from 'lucide-react';
import { cn } from '../../lib/cn';

// Light-on-dark control to match the dark top bar.
const iconBtn = 'relative inline-flex h-9 w-9 items-center justify-center rounded-btn text-white/70 transition-colors hover:bg-white/10 hover:text-white';

// Demo notifications — swap for a real feed (e.g. GET /notifications) when available.
const DEMO = [
  { id: 1, icon: UserPlus, title: 'New enrollment', body: 'Priya Sharma enrolled in Grade 9 — Science.', time: '2m ago', unread: true },
  { id: 2, icon: Megaphone, title: 'Term announcement', body: 'Mid-term reports publish this Friday.', time: '1h ago', unread: true },
  { id: 3, icon: CheckCircle2, title: 'Branding saved', body: 'Your portal theme was updated successfully.', time: 'Yesterday', unread: false },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = DEMO.filter((n) => n.unread).length;

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Notifications" aria-haspopup="menu" aria-expanded={open} className={iconBtn}>
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-pill px-1 text-[9px] font-bold text-accent-foreground" style={{ backgroundColor: 'var(--color-accent)' }}>
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-card border border-border bg-card text-foreground shadow-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <span className="text-xs text-muted-foreground">{unread} unread</span>
          </div>
          <ul className="scrollbar-none max-h-80 overflow-y-auto">
            {DEMO.map((n) => {
              const Icon = n.icon;
              return (
                <li key={n.id} className={cn('flex gap-3 border-b border-border px-4 py-3 last:border-0', n.unread && 'bg-muted/40')}>
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-pill" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)' }}>
                    <Icon className="h-4 w-4 text-accent" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">{n.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className="w-full border-t border-border px-4 py-2.5 text-center text-xs font-medium text-accent transition-colors hover:bg-muted">
            View all notifications
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
