/**
 * Per-tenant DESIGN registry — fonts + shape tokens, plus a few bundled templates. Mirrors the
 * design language from the reference, adapted to Calcite LMS's CSS-variable theming. Every default
 * reproduces today's look (Inter, lightly-rounded, soft shadow), so an empty/default `design`
 * renders exactly the current UI.
 *
 * Applied as CSS variables on <html> by BrandingProvider.applyBranding().
 *
 * NOTE: existing app chrome uses static utilities (rounded-xl, shadow-card was made var-driven, etc.)
 * and `font-sans`. The font/shape tokens here drive the Branding "Design" preview and any component
 * that opts into `font-heading`/`rounded-card`/etc — colours (handled in themePresets.js) are what
 * recolour the whole app live.
 */

/* ── Curated fonts ──────────────────────────────────────────────────────────
 * stack  = CSS font-family applied (var --font-heading/body/nav)
 * google = Google Fonts spec to load (null = no web font needed)
 * roles  = which pickers it's offered in
 */
export const FONTS = [
  { id: 'inter', name: 'Inter — default', stack: '"Inter", ui-sans-serif, system-ui, sans-serif', google: 'Inter:wght@400;500;600;700', roles: ['heading', 'body', 'nav'] },
  { id: 'poppins', name: 'Poppins', stack: '"Poppins", ui-sans-serif, system-ui, sans-serif', google: 'Poppins:wght@400;500;600;700', roles: ['heading', 'body', 'nav'] },
  { id: 'outfit', name: 'Outfit', stack: '"Outfit", ui-sans-serif, system-ui, sans-serif', google: 'Outfit:wght@400;500;600;700', roles: ['heading', 'body', 'nav'] },
  { id: 'dmSans', name: 'DM Sans', stack: '"DM Sans", ui-sans-serif, system-ui, sans-serif', google: 'DM+Sans:wght@400;500;600;700', roles: ['heading', 'body', 'nav'] },
  { id: 'workSans', name: 'Work Sans', stack: '"Work Sans", ui-sans-serif, system-ui, sans-serif', google: 'Work+Sans:wght@400;500;600;700', roles: ['heading', 'body', 'nav'] },
  { id: 'nunito', name: 'Nunito', stack: '"Nunito", ui-sans-serif, system-ui, sans-serif', google: 'Nunito:wght@400;500;600;700', roles: ['heading', 'body', 'nav'] },
  { id: 'sourceSans', name: 'Source Sans 3', stack: '"Source Sans 3", ui-sans-serif, system-ui, sans-serif', google: 'Source+Sans+3:wght@400;500;600;700', roles: ['heading', 'body', 'nav'] },
  { id: 'playfair', name: 'Playfair Display', stack: '"Playfair Display", Georgia, serif', google: 'Playfair+Display:wght@400;500;600;700', roles: ['heading'] },
  { id: 'lora', name: 'Lora', stack: '"Lora", Georgia, serif', google: 'Lora:wght@400;500;600;700', roles: ['heading', 'body'] },
  { id: 'merriweather', name: 'Merriweather', stack: '"Merriweather", Georgia, serif', google: 'Merriweather:wght@400;700', roles: ['heading', 'body'] },
  { id: 'sourceSerif', name: 'Source Serif 4', stack: '"Source Serif 4", Georgia, serif', google: 'Source+Serif+4:wght@400;500;600;700', roles: ['heading', 'body'] },
];
export const FONT_MAP = FONTS.reduce((a, f) => ((a[f.id] = f), a), {});
export const fontsForRole = (role) => FONTS.filter((f) => f.roles.includes(role));

/* ── Shape options (defaults = current look) ─────────────────────────────── */
export const ROUNDNESS = [
  { id: 'sharp', name: 'Sharp', vars: { '--radius-card': '0px', '--radius-btn': '0px', '--radius-input': '0px', '--radius-pill': '9999px' } },
  { id: 'soft', name: 'Soft', vars: { '--radius-card': '8px', '--radius-btn': '6px', '--radius-input': '6px', '--radius-pill': '9999px' } },
  { id: 'rounded', name: 'Rounded', vars: { '--radius-card': '0.9rem', '--radius-btn': '0.5rem', '--radius-input': '0.5rem', '--radius-pill': '9999px' } },
  { id: 'pill', name: 'Pill', vars: { '--radius-card': '20px', '--radius-btn': '9999px', '--radius-input': '12px', '--radius-pill': '9999px' } },
];
export const BORDER_WIDTH = [
  { id: 'thin', name: 'Thin', vars: { '--border-width': '1px' } },
  { id: 'none', name: 'None', vars: { '--border-width': '0px' } },
  { id: 'bold', name: 'Bold', vars: { '--border-width': '2px' } },
];
export const SHADOW = [
  { id: 'soft', name: 'Soft', vars: { '--card-shadow': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)' } },
  { id: 'none', name: 'None', vars: { '--card-shadow': 'none' } },
  { id: 'lifted', name: 'Lifted', vars: { '--card-shadow': '0 10px 24px -8px rgb(0 0 0 / 0.14)' } },
];
export const ROUNDNESS_MAP = ROUNDNESS.reduce((a, x) => ((a[x.id] = x), a), {});
export const BORDER_WIDTH_MAP = BORDER_WIDTH.reduce((a, x) => ((a[x.id] = x), a), {});
export const SHADOW_MAP = SHADOW.reduce((a, x) => ((a[x.id] = x), a), {});

/* ── Predefined templates (fonts + shape + optional colour theme) ─────────── */
// `colorThemeId` references a preset in themePresets.js (resolved by the Branding page); null = keep
// the tenant's current colours.
export const TEMPLATES = [
  { id: 'classic', name: 'Classic', desc: 'The current look — Inter, lightly rounded.', colorThemeId: null, fonts: { heading: 'inter', body: 'inter', nav: 'inter' }, shape: { roundness: 'rounded', borderWidth: 'thin', shadow: 'soft' } },
  { id: 'modern', name: 'Modern', desc: 'Poppins headings, rounded, lifted cards.', colorThemeId: 'modern-slate', fonts: { heading: 'poppins', body: 'inter', nav: 'inter' }, shape: { roundness: 'rounded', borderWidth: 'none', shadow: 'lifted' } },
  { id: 'editorial', name: 'Editorial', desc: 'Playfair display over a readable serif.', colorThemeId: 'warm-burgundy', fonts: { heading: 'playfair', body: 'lora', nav: 'inter' }, shape: { roundness: 'soft', borderWidth: 'thin', shadow: 'soft' } },
  { id: 'minimal', name: 'Minimal', desc: 'Quiet, borderless, flat.', colorThemeId: 'pro-charcoal', fonts: { heading: 'outfit', body: 'inter', nav: 'inter' }, shape: { roundness: 'sharp', borderWidth: 'none', shadow: 'none' } },
  { id: 'coastal', name: 'Coastal', desc: 'Fresh ocean blues, soft rounded cards.', colorThemeId: 'nature-ocean', fonts: { heading: 'workSans', body: 'sourceSans', nav: 'workSans' }, shape: { roundness: 'rounded', borderWidth: 'none', shadow: 'soft' } },
  { id: 'heritage', name: 'Heritage', desc: 'Warm terracotta, classic serif.', colorThemeId: 'warm-terracotta', fonts: { heading: 'merriweather', body: 'lora', nav: 'inter' }, shape: { roundness: 'soft', borderWidth: 'thin', shadow: 'soft' } },
  { id: 'midnight', name: 'Midnight', desc: 'Deep indigo, sleek sans.', colorThemeId: 'pro-midnight', fonts: { heading: 'outfit', body: 'dmSans', nav: 'dmSans' }, shape: { roundness: 'rounded', borderWidth: 'none', shadow: 'lifted' } },
  { id: 'grove', name: 'Grove', desc: 'Forest greens, friendly rounded sans.', colorThemeId: 'nature-forest', fonts: { heading: 'dmSans', body: 'nunito', nav: 'dmSans' }, shape: { roundness: 'rounded', borderWidth: 'none', shadow: 'soft' } },
];
export const TEMPLATE_MAP = TEMPLATES.reduce((a, t) => ((a[t.id] = t), a), {});

/* The baseline design — equals today's look. Used when a tenant has no design. */
export const DEFAULT_DESIGN = {
  templateId: 'classic',
  colorThemeId: null,
  fonts: { heading: 'inter', body: 'inter', nav: 'inter' },
  shape: { roundness: 'rounded', borderWidth: 'thin', shadow: 'soft' },
};

/** Merge a stored (partial) design over the baseline so all fields resolve. */
export function resolveDesign(design) {
  const d = design || {};
  return {
    templateId: d.templateId || DEFAULT_DESIGN.templateId,
    colorThemeId: d.colorThemeId ?? null,
    fonts: { ...DEFAULT_DESIGN.fonts, ...(d.fonts || {}) },
    shape: { ...DEFAULT_DESIGN.shape, ...(d.shape || {}) },
  };
}

/** The full set of font + shape CSS vars for a design. */
export function designCssVars(design) {
  const d = resolveDesign(design);
  const vars = {};
  ['heading', 'body', 'nav'].forEach((role) => {
    vars[`--font-${role}`] = (FONT_MAP[d.fonts[role]] || FONT_MAP.inter).stack;
  });
  Object.assign(
    vars,
    ROUNDNESS_MAP[d.shape.roundness]?.vars || {},
    BORDER_WIDTH_MAP[d.shape.borderWidth]?.vars || {},
    SHADOW_MAP[d.shape.shadow]?.vars || {},
  );
  return vars;
}

/** Inject a Google font stylesheet once (no-op when already present). */
export function loadFontById(id) {
  if (typeof document === 'undefined') return;
  const font = FONT_MAP[id];
  if (!font || !font.google) return;
  const elId = `gfont-${font.id}`;
  if (document.getElementById(elId)) return;
  const link = document.createElement('link');
  link.id = elId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
  document.head.appendChild(link);
}

/** Ensure every font a design references is loaded. */
export function loadFontsForDesign(design) {
  const d = resolveDesign(design);
  [...new Set(Object.values(d.fonts))].forEach(loadFontById);
}
