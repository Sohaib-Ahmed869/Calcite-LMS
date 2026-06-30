import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Shared enrolment-status model + dropdown. `ENR_STATUS_META` drives every status surface
 * (left accent strips, the trigger pill, dropdown dots) so the four states look identical
 * across the Enrolments list and the Student detail page.
 */
export const ENR_STATUS_META = {
  active: { label: 'Active', cls: 'text-accent', dot: 'var(--color-accent)', bg: 'rgba(var(--color-accent-rgb), 0.12)' },
  completed: { label: 'Completed', cls: 'text-success', dot: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 14%, transparent)' },
  suspended: { label: 'Suspended', cls: 'text-warning', dot: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 14%, transparent)' },
  withdrawn: { label: 'Withdrawn', cls: 'text-muted-foreground', dot: 'var(--color-mutedForeground)', bg: 'var(--color-muted)' },
};
export const ENR_STATUS_KEYS = ['active', 'suspended', 'withdrawn', 'completed'];

const MENU_W = 176; // matches w-44
const MENU_H = ENR_STATUS_KEYS.length * 34 + 16; // approximate, for the flip-up decision

/**
 * Compact, colour-coded status dropdown — no search box (just four states). The menu renders in a
 * body portal with fixed positioning, so it's never clipped by an overflow-hidden table/card, and
 * it flips above the trigger when there isn't room below. Closes on outside-click, Escape or scroll.
 */
export function EnrollmentStatusMenu({ value, onChange, className }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // { left, top } in viewport coords
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const m = ENR_STATUS_META[value] || ENR_STATUS_META.active;

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const up = spaceBelow < MENU_H + 8 && r.top > spaceBelow;
    const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
    const top = up ? r.top - MENU_H - 6 : r.bottom + 6;
    setPos({ left, top });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true); // any scroll (page or container) dismisses it
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { if (open) { setOpen(false); } else { place(); setOpen(true); } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn('inline-flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-shadow hover:shadow-soft', m.cls, className)}
        style={{ backgroundColor: m.bg }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: m.dot }} />
          <span className="truncate">{m.label}</span>
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              style={{ position: 'fixed', left: pos.left, top: pos.top, width: MENU_W }}
              className="z-[9999] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lift"
            >
              {ENR_STATUS_KEYS.map((key) => {
                const om = ENR_STATUS_META[key];
                const selected = key === value;
                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => { setOpen(false); if (key !== value) onChange(key); }}
                    className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted', selected && 'bg-muted')}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: om.dot }} />
                    <span className="flex-1 truncate text-foreground">{om.label}</span>
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-accent" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default EnrollmentStatusMenu;
