import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../lib/cn';

const PANEL_MAX = 300; // approx panel height (search row + max-h-60 list) used for flip decision

/**
 * A searchable dropdown. `options` = [{ value, label, font? }]; each row renders in its own `font`
 * so the typography pickers preview the actual typeface. Calls `onChange(value)`. Opens upward when
 * there isn't enough room below the trigger (e.g. near a modal footer).
 */
export function CustomSelect({ value, onChange, options = [], placeholder = 'Select…', searchPlaceholder = 'Search…' }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  // Decide direction before opening: drop up only when space below is tight AND above has more room.
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setDropUp(below < PANEL_MAX && r.top > below);
    }
    setOpen((o) => !o);
  };

  const selected = options.find((o) => o.value === value) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors hover:border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20"
      >
        <span className="truncate" style={selected?.font ? { fontFamily: selected.font } : undefined}>
          {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className={cn('absolute z-50 w-full overflow-hidden rounded-card border border-border bg-card shadow-card', dropUp ? 'bottom-full mb-2' : 'top-full mt-2')}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="scrollbar-none max-h-60 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange?.(o.value);
                        setOpen(false);
                      }}
                      className={cn('flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted', active && 'text-accent')}
                      style={o.font ? { fontFamily: o.font } : undefined}
                    >
                      <span className="truncate">{o.label}</span>
                      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default CustomSelect;
