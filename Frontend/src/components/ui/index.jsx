import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

/** Circular avatar — image when `src` is set, otherwise initials on a brand-tinted disc. */
export function Avatar({ name, src, size = 'md', className }) {
  const cls = cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-pill font-semibold', SIZES[size] || SIZES.md, className);
  // Reset the error flag whenever the source changes, so a new upload re-attempts to load.
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [src]);
  if (src && !imgError) {
    // Fall back to initials if the image fails to load (e.g. an expired signed URL).
    return <img src={src} alt={name || 'avatar'} onError={() => setImgError(true)} className={cls} />;
  }
  return (
    <span
      className={cn(cls, 'text-white')}
      style={{ background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 75%, #000))' }}
    >
      {initials(name)}
    </span>
  );
}

/** A small status/label pill. */
export function Badge({ children, tone = 'muted', className }) {
  const tones = {
    muted: 'bg-muted text-muted-foreground',
    accent: 'text-accent',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
  };
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium', tones[tone] || tones.muted, className)}
      style={tone === 'accent' ? accentTint(0.12) : undefined}
    >
      {children}
    </span>
  );
}

/** A token-styled surface card. */
export function Card({ className, children, ...props }) {
  return (
    <div className={cn('rounded-card border border-border bg-card p-5 shadow-card', className)} {...props}>
      {children}
    </div>
  );
}

/* ── Button ──────────────────────────────────────────────────────────────────── */
const BTN_VARIANTS = {
  primary: 'bg-accent text-accent-foreground shadow-sm hover:opacity-90',
  secondary: 'border border-border bg-card text-foreground hover:border-accent/60 hover:text-accent',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger: 'bg-danger text-white shadow-sm hover:opacity-90',
  dangerGhost: 'text-danger hover:bg-danger/10',
  white: 'border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20',
};
const BTN_SIZES = {
  sm: 'gap-1.5 px-3 py-1.5 text-xs',
  md: 'gap-2 px-4 py-2.5 text-sm',
  icon: 'h-9 w-9 justify-center',
  iconSm: 'h-8 w-8 justify-center',
};

/** Token-styled button. `variant` × `size`, optional leading `icon`, `loading` spinner. */
export function Button({ as: Comp = 'button', variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading = false, disabled, children, className, ...props }) {
  const iconCls = size === 'sm' || size === 'iconSm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <Comp
      className={cn(
        'inline-flex items-center justify-center rounded-btn font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60',
        BTN_VARIANTS[variant] || BTN_VARIANTS.primary,
        BTN_SIZES[size] || BTN_SIZES.md,
        className,
      )}
      disabled={Comp === 'button' ? loading || disabled : undefined}
      {...props}
    >
      {loading ? <Loader2 className={cn(iconCls, 'animate-spin')} /> : Icon ? <Icon className={iconCls} /> : null}
      {children}
      {IconRight ? <IconRight className={iconCls} /> : null}
    </Comp>
  );
}

/* ── EmptyState ──────────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-card px-6 py-14 text-center', className)}>
      {Icon ? (
        <span className="mb-4 grid h-16 w-16 place-items-center rounded-full text-accent" style={accentTint(0.1)}>
          <Icon className="h-8 w-8" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────────── */
const MODAL_SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

/**
 * Portal modal with a backdrop + spring entrance (framer-motion). Header (icon/title/subtitle) and
 * footer are optional; the body scrolls when tall. Esc and backdrop-click close it.
 */
export function Modal({ open, onClose, title, subtitle, icon: Icon, size = 'md', children, footer, closeOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={closeOnBackdrop ? onClose : undefined}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn('relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-card', MODAL_SIZES[size] || MODAL_SIZES.md)}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {title || Icon ? (
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  {Icon ? (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card text-accent" style={accentTint(0.12)}>
                      <Icon className="h-5 w-5" />
                    </span>
                  ) : null}
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
                    {subtitle ? <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
                  </div>
                </div>
                <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer ? <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/* ── ConfirmDialog ───────────────────────────────────────────────────────────── */
export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', cancelLabel = 'Cancel', tone = 'danger', loading = false }) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      icon={AlertTriangle}
      size="sm"
      closeOnBackdrop={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="px-5 py-5 text-sm text-muted-foreground">{message}</div>
    </Modal>
  );
}

export default Avatar;
