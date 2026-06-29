import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Lock, Eye, EyeOff, ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '../lib/cn';

/** A labelled form field with optional hint text. */
export function Field({ label, hint, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <label className="block text-sm font-medium text-foreground">{label}</label> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className={label || hint ? 'pt-0.5' : undefined}>{children}</div>
    </div>
  );
}

/**
 * Token-styled text input — follows the tenant's shape + colours. Pass `icon` (a lucide component)
 * to render a leading glyph; the input pads itself to clear it.
 */
export function TextInput({ icon: Icon, className, ...props }) {
  const input = (
    <input
      className={cn(
        'w-full rounded-input border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors',
        'placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        Icon && 'pl-9',
        className,
      )}
      {...props}
    />
  );
  if (!Icon) return input;
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      {input}
    </div>
  );
}

/** A password input with a show/hide toggle, wrapped in a labelled Field. */
export function PasswordField({ label, hint, className, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint} className={className}>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={show ? 'text' : 'password'}
          className={cn(
            'w-full rounded-input border border-border bg-card px-3 py-2.5 pl-9 pr-10 text-sm text-foreground shadow-sm outline-none transition-colors',
            'placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20',
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

const STRENGTH = [
  { label: 'Too weak', color: 'var(--color-danger)' },
  { label: 'Weak', color: 'var(--color-danger)' },
  { label: 'Fair', color: 'var(--color-warning)' },
  { label: 'Good', color: 'var(--color-warning)' },
  { label: 'Strong', color: 'var(--color-success)' },
];

/** A four-segment password-strength meter. Renders nothing until the user starts typing. */
export function PasswordStrength({ value = '' }) {
  if (!value) return null;
  const checks = [value.length >= 6, /[A-Z]/.test(value), /[a-z]/.test(value), /\d/.test(value)];
  const score = checks.filter(Boolean).length;
  const level = STRENGTH[score];
  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-pill transition-colors"
            style={{ backgroundColor: i < score ? level.color : 'var(--color-border)' }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs font-medium" style={{ color: level.color }}>
        {level.label}
      </p>
    </div>
  );
}

/** Primary submit button with a built-in saving spinner. */
export function SaveButton({ saving, children = 'Save', className, ...props }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {saving ? 'Saving…' : children}
    </button>
  );
}

/** A brand-gradient cover strip — used as the backdrop for the profile identity header. */
export function Banner({ className }) {
  return (
    <div
      className={cn('h-24 w-full', className)}
      style={{ background: 'linear-gradient(120deg, var(--color-primary), var(--color-accent))' }}
    />
  );
}

// Dial codes for the phone selector. Order matters for prefix matching: when two countries share a
// dial code (e.g. US/CA = +1) the first listed wins on parse. Mirrors the page's COUNTRIES list.
const DIAL_CODES = [
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'FJ', name: 'Fiji', dial: '+679', flag: '🇫🇯' },
];

const DEFAULT_DIAL = DIAL_CODES[0]; // Australia — the app's primary locale.

/** Split a stored phone string into its country (by longest dial-code prefix) and national number. */
function parsePhone(value) {
  const v = String(value || '').trim();
  let best = null;
  for (const c of DIAL_CODES) {
    if (v.startsWith(c.dial) && (!best || c.dial.length > best.dial.length)) best = c;
  }
  if (best) return { country: best, number: v.slice(best.dial.length).trim() };
  return { country: DEFAULT_DIAL, number: v };
}

/**
 * A phone field with a searchable country-code (dial code) selector. `value` is the full string
 * (e.g. "+61 400 123 456"); `onChange(nextValue)` receives the recombined string.
 */
export function PhoneInput({ value, onChange, placeholder = '400 123 456' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const { country, number } = parsePhone(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DIAL_CODES;
    return DIAL_CODES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.includes(q));
  }, [query]);

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

  // Always keep the dial code so the chosen country survives even when the number is cleared.
  const emit = (c, n) => {
    const nn = String(n).replace(/^\s+/, '');
    onChange(nn ? `${c.dial} ${nn}` : c.dial);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-stretch overflow-hidden rounded-input border border-border bg-card shadow-sm transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex shrink-0 items-center gap-1.5 border-r border-border px-3 text-sm text-foreground transition-colors hover:bg-muted"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium">{country.dial}</span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </button>
        <input
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) => emit(country, e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open ? (
        <div className="absolute z-50 mt-2 w-full min-w-[260px] overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code…"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="scrollbar-none max-h-60 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>
            ) : (
              filtered.map((c) => {
                const active = c.code === country.code;
                return (
                  <li key={c.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        emit(c, number);
                        setOpen(false);
                      }}
                      className={cn('flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted', active && 'text-accent')}
                    >
                      <span className="text-base leading-none">{c.flag}</span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="shrink-0 text-muted-foreground">{c.dial}</span>
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

/** A section header with a tinted icon, title and description. */
export function SectionHead({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3">
      {Icon ? (
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.12)' }}>
          <Icon className="h-5 w-5 text-accent" />
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {desc ? <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p> : null}
      </div>
    </div>
  );
}

export default Field;
