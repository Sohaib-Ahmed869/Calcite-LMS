// positive percent = darken, negative = lighten.
function shift(hex, percent) {
  const num = parseInt(String(hex || '').replace('#', ''), 16);
  if (Number.isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max((num >> 16) - amt, 0));
  const g = Math.min(255, Math.max(((num >> 8) & 0xff) - amt, 0));
  const b = Math.min(255, Math.max((num & 0xff) - amt, 0));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Expand a seed into all 19 tokens. `primary` doubles as the body `foreground` (dark text).
function pal(primary, accent, background, sidebar) {
  return {
    primary,
    primaryForeground: '#ffffff',
    accent,
    accentForeground: '#ffffff',
    background,
    foreground: primary,
    card: '#ffffff',
    cardForeground: primary,
    sidebar,
    sidebarForeground: '#e2e8f0',
    sidebarAccent: shift(sidebar, -14),
    sidebarBorder: shift(sidebar, -6),
    border: '#e2e8f0',
    ring: accent,
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    danger: '#b91c1c',
    success: '#16a34a',
    warning: '#d97706',
  };
}

const t = (id, name, desc, primary, accent, background, sidebar) => ({
  id,
  name,
  desc,
  colors: pal(primary, accent, background, sidebar),
});

export const themeCategories = [
  {
    id: 'warm',
    name: 'Warm & Classic',
    description: 'Traditional, warm and inviting tones',
    themes: [
      t('default', 'Navy & Amber', 'The Calcite LMS default', '#0a2952', '#c77700', '#f8fafc', '#0a2952'),
      t('warm-amber', 'Amber Glow', 'Rich amber warmth', '#3e2723', '#ff8f00', '#fff8e1', '#4e342e'),
      t('warm-terracotta', 'Terracotta', 'Earthy terracotta', '#4a2c2a', '#c75b39', '#fbf0eb', '#5d4037'),
      t('warm-burgundy', 'Burgundy', 'Deep, rich burgundy', '#3c1421', '#9c254d', '#fdf2f4', '#4a1a2e'),
      t('warm-copper', 'Copper', 'Warm metallic copper', '#3b2f2f', '#b87333', '#faf6f0', '#4b3b3b'),
      t('warm-mahogany', 'Mahogany', 'Deep mahogany wood', '#2e1503', '#8b4513', '#fdf5ee', '#3e2513'),
      t('warm-cinnamon', 'Cinnamon', 'Spiced cinnamon', '#3b1f0b', '#d2691e', '#fff5eb', '#4a2e1a'),
      t('warm-rust', 'Rust', 'Vintage rust', '#2d1b0e', '#a0522d', '#faf0e6', '#3d2b1e'),
      t('warm-honey', 'Honey', 'Sweet honey gold', '#2c2418', '#daa520', '#fffef5', '#3c3428'),
      t('warm-clay', 'Clay', 'Natural clay tones', '#3a2a1f', '#cc7722', '#f8f0e3', '#4a3a2f'),
    ],
  },
  {
    id: 'modern',
    name: 'Modern & Bold',
    description: 'Contemporary, high-contrast accents',
    themes: [
      t('modern-crimson', 'Crimson', 'Bold and contemporary', '#1a1a2e', '#e94560', '#f8f9fa', '#16213e'),
      t('modern-electric', 'Electric Blue', 'Electric energy', '#0d1b2a', '#0077b6', '#f0f4f8', '#1b2838'),
      t('modern-violet', 'Violet', 'Regal purple', '#1a1a2e', '#7c3aed', '#f5f3ff', '#1e1b4b'),
      t('modern-magenta', 'Magenta', 'Vibrant magenta', '#1c1c2e', '#db2777', '#fdf2f8', '#2d1b36'),
      t('modern-coral', 'Coral', 'Warm coral energy', '#1a1a2a', '#f97316', '#fff7ed', '#2a1a1a'),
      t('modern-cyan', 'Cyan', 'Cool cyan freshness', '#0f172a', '#06b6d4', '#ecfeff', '#0e1f33'),
      t('modern-rose', 'Rose', 'Elegant rose accents', '#1c1917', '#e11d48', '#fff1f2', '#2c2927'),
      t('modern-indigo', 'Indigo', 'Deep indigo', '#1e1b4b', '#4f46e5', '#eef2ff', '#1e1b4b'),
      t('modern-emerald', 'Emerald', 'Bold emerald contrast', '#0f172a', '#10b981', '#f0fdf4', '#162032'),
      t('modern-slate', 'Slate', 'Sleek and minimal', '#0f172a', '#6366f1', '#f8fafc', '#1e293b'),
    ],
  },
  {
    id: 'nature',
    name: 'Nature & Earth',
    description: 'Organic palettes from the environment',
    themes: [
      t('nature-forest', 'Forest', 'Deep forest greens', '#1b4332', '#40916c', '#f0fff4', '#1a3a2a'),
      t('nature-ocean', 'Ocean', 'Calming ocean blues', '#0c4a6e', '#0284c7', '#f0f9ff', '#0a3a5e'),
      t('nature-sage', 'Sage', 'Earthy sage greens', '#3d405b', '#81b29a', '#f4f1de', '#2d3040'),
      t('nature-lavender', 'Lavender', 'Soft lavender blooms', '#3b3355', '#9b72cf', '#f5f0ff', '#2b2345'),
      t('nature-moss', 'Moss', 'Subtle moss greens', '#2d3b2d', '#5c8a4d', '#f2f7f0', '#1d2b1d'),
      t('nature-sand', 'Sand Dune', 'Desert sand warmth', '#4a4035', '#c4a35a', '#faf6ed', '#3a3025'),
      t('nature-sky', 'Clear Sky', 'Open sky clarity', '#1e3a5f', '#4da8da', '#f0f8ff', '#152a4a'),
      t('nature-stone', 'River Stone', 'Smooth stone neutrals', '#374151', '#6b7280', '#f3f4f6', '#1f2937'),
      t('nature-sunset', 'Sunset', 'Warm sunset glow', '#2b2d42', '#ef8354', '#fff8f0', '#1b1d32'),
      t('nature-meadow', 'Meadow', 'Fresh meadow greens', '#2d4a22', '#7cb342', '#f1f8e9', '#1d3a12'),
    ],
  },
  {
    id: 'professional',
    name: 'Professional & Clean',
    description: 'Corporate-ready, trustworthy designs',
    themes: [
      t('pro-classic', 'Classic Blue', 'Trusted corporate blue', '#2d3436', '#0984e3', '#ffffff', '#2c3e50'),
      t('pro-charcoal', 'Charcoal', 'Sophisticated charcoal', '#2d3436', '#636e72', '#ffffff', '#2d3436'),
      t('pro-navy', 'Navy', 'Authoritative navy', '#1b2a4a', '#2e86c1', '#fafbfc', '#152238'),
      t('pro-steel', 'Steel', 'Industrial steel', '#263238', '#546e7a', '#fafafa', '#1c2832'),
      t('pro-graphite', 'Graphite', 'Premium graphite', '#212121', '#5c6bc0', '#fafafa', '#1a1a1a'),
      t('pro-royal', 'Royal', 'Royal blue prestige', '#1a237e', '#3949ab', '#f5f5ff', '#0d1457'),
      t('pro-teal', 'Teal', 'Professional teal', '#1a3c34', '#009688', '#f0fdfa', '#0d2c24'),
      t('pro-executive', 'Executive', 'Executive burgundy', '#2c1320', '#880e4f', '#fff5f8', '#1c0810'),
      t('pro-midnight', 'Midnight', 'Deep midnight', '#0a0e27', '#5c6bc0', '#f8f9ff', '#060a1a'),
      t('pro-titanium', 'Titanium', 'Sleek titanium', '#37474f', '#78909c', '#eceff1', '#263238'),
    ],
  },
];

// Flat lookup: themeId → theme (with categoryId/categoryName).
const themeMap = {};
themeCategories.forEach((cat) => {
  cat.themes.forEach((theme) => {
    themeMap[theme.id] = { ...theme, categoryId: cat.id, categoryName: cat.name };
  });
});

export function getThemeById(id) {
  return themeMap[id] || themeMap.default;
}

export { themeMap };
export default themeCategories;
