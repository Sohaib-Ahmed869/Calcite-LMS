import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { designCssVars, loadFontsForDesign } from '../admin-ui/designSystem';
import { BrandSpinner } from '../admin-ui/Loader';

// hex (#rrggbb) → "r, g, b" for alpha tints: rgba(var(--color-accent-rgb), 0.1).
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : null;
}

function hexTriple(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

// Blend two hex colours; weight 0 → a, 1 → b.
function mix(a, b, weight) {
  const pa = hexTriple(a);
  const pb = hexTriple(b);
  if (!pa || !pb) return a;
  const ch = (i) => Math.max(0, Math.min(255, Math.round(pa[i] + (pb[i] - pa[i]) * weight)));
  return '#' + [ch(0), ch(1), ch(2)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive dark-mode surface tokens from the applied palette so dark mode CARRIES the brand and matches
 * the sidebar/header frame (which paint with `--color-sidebar`). We darken the brand hue itself
 * (preserving the colour) rather than tinting near-black, so a navy palette gives dark-navy surfaces,
 * a forest palette dark-green, etc. Layering: background (darkest) < card < muted, all one family.
 */
function deriveDarkSurfaces(colors = {}) {
  const brand = colors.sidebar || colors.primary || '#0b1020';
  return {
    background: mix(brand, '#000000', 0.52), // darkest — matches the brand frame, just deeper
    foreground: mix('#eef1f6', brand, 0.06),
    card: mix(brand, '#000000', 0.38), // a step lighter so cards lift off the page
    cardForeground: mix('#eef1f6', brand, 0.06),
    muted: mix(brand, '#000000', 0.28),
    mutedForeground: mix('#aab4c2', brand, 0.12),
    border: mix(brand, '#ffffff', 0.12), // brand lightened → a visible, on-brand divider
  };
}

/**
 * The dynamic-theming engine. On boot it fetches the active tenant's branding (public endpoint,
 * resolved by X-Tenant-Code) and applies it to the live document:
 *   • every colour token → a `--color-*` CSS variable on <html>  (drives all Tailwind tokens)
 *   • favicon  → swaps the <link id="favicon"> href
 *   • title    → document.title = displayName
 *   • theme    → toggles the `dark` class
 * Logos (full / mark / header) are exposed via context for the shell to render.
 *
 * Until it resolves we show a neutral splash; if the fetch fails we fall back to the default theme
 * baked into :root (src/index.css) so the app still renders.
 */
const BrandingContext = createContext(null);

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within <BrandingProvider>');
  return ctx;
}

export function applyBranding(branding) {
  const root = document.documentElement;

  for (const [token, value] of Object.entries(branding.colors || {})) {
    root.style.setProperty(`--color-${token}`, value);
  }
  // Alpha-tint helpers — re-derived from the live palette so `rgba(var(--color-accent-rgb), .1)` works.
  const primaryRgb = hexToRgb(branding.colors?.primary);
  const accentRgb = hexToRgb(branding.colors?.accent);
  if (primaryRgb) root.style.setProperty('--color-primary-rgb', primaryRgb);
  if (accentRgb) root.style.setProperty('--color-accent-rgb', accentRgb);

  // Dark-mode surfaces, tinted from the palette so dark mode follows the applied theme.
  // `[data-admin-theme='dark']` (index.css) remaps the neutral tokens to these `--color-*-dark` vars.
  for (const [token, value] of Object.entries(deriveDarkSurfaces(branding.colors))) {
    root.style.setProperty(`--color-${token}-dark`, value);
  }

  // Design (fonts + shape) — applied as CSS vars; fonts lazy-loaded.
  if (branding.design) {
    const vars = designCssVars(branding.design);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    loadFontsForDesign(branding.design);
  }

  root.classList.toggle('dark', branding.theme === 'dark');

  if (branding.displayName) document.title = branding.displayName;

  if (branding.faviconUrl) {
    let link = document.getElementById('favicon');
    if (!link) {
      link = document.createElement('link');
      link.id = 'favicon';
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.faviconUrl;
  }
}

function BrandingSplash() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <BrandSpinner size="lg" />
    </div>
  );
}

export function BrandingProvider({ children }) {
  const [state, setState] = useState({ loading: true, branding: null, tenant: null, error: null });

  useEffect(() => {
    let alive = true;
    apiGet('/tenant/branding', { auth: false })
      .then((res) => {
        if (!alive) return;
        applyBranding(res.branding);
        setState({ loading: false, branding: res.branding, tenant: { code: res.code, name: res.name }, error: null });
      })
      .catch((error) => {
        // Keep the default :root theme; surface the error for debugging but don't block the app.
        if (alive) setState({ loading: false, branding: null, tenant: null, error });
      });
    return () => {
      alive = false;
    };
  }, []);

  // Apply a freshly-saved branding to the live document AND publish it to the shared context, so
  // chrome that reads from context (sidebar/header logos, display name, favicon) refreshes in place —
  // no full-page reload needed. Used by the Branding settings page after a successful save.
  const updateBranding = useCallback((branding) => {
    if (!branding) return;
    applyBranding(branding);
    setState((s) => ({ ...s, branding }));
  }, []);

  if (state.loading) return <BrandingSplash />;

  return (
    <BrandingContext.Provider value={{ branding: state.branding, tenant: state.tenant, error: state.error, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}
