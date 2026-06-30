import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, SwatchBook, Type, Shapes, LayoutTemplate, Star, Check, Loader2, RotateCcw, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiPut, apiUpload } from '../../lib/api';
import { humanize } from '../../lib/format';
import { applyBranding, useBranding } from '../../theme/BrandingProvider';
import { cn } from '../../lib/cn';
import { Button } from '../../components/ui';
import { TabRail } from '../../admin-ui/TabRail';
import { Dropzone } from '../../admin-ui/Dropzone';
import { CustomSelect } from '../../admin-ui/CustomSelect';
import { useAdminUi } from '../../admin-ui/AdminUiContext';
import { Field, TextInput, SectionHead } from '../../admin-ui/fields';
import themeCategories, { getThemeById } from '../../admin-ui/themePresets';
import { FONTS, fontsForRole, ROUNDNESS, BORDER_WIDTH, SHADOW, TEMPLATES, resolveDesign, loadFontById, DEFAULT_DESIGN, FONT_MAP, ROUNDNESS_MAP, BORDER_WIDTH_MAP, SHADOW_MAP } from '../../admin-ui/designSystem';

// Gradient banner + accent tint — shared visual language with the Courses header.
const GRADIENT = 'linear-gradient(120deg, var(--color-primary), var(--color-accent))';
const accentTint = (a) => ({ backgroundColor: `rgba(var(--color-accent-rgb), ${a})` });

const SECTIONS = [
  { id: 'identity', label: 'Identity', desc: 'Name, logos & favicon', icon: ImageIcon },
  { id: 'palette', label: 'Palette', desc: 'Colours & presets', icon: SwatchBook },
  { id: 'typography', label: 'Typography', desc: 'Fonts', icon: Type },
  { id: 'shape', label: 'Shape', desc: 'Corners, borders & shadow', icon: Shapes },
  { id: 'templates', label: 'Templates', desc: 'One-tap starts', icon: LayoutTemplate },
];

// Upload-slot → the `logos` field it writes (favicon writes `faviconUrl` instead, handled inline).
const SLOT_FIELD = { full: 'full', mark: 'mark', markDark: 'markDark', header: 'header' };

// The three typography roles rendered in the Typography section.
const TYPO_ROLES = [
  { role: 'heading', label: 'Heading font', hint: 'Titles & section headings' },
  { role: 'body', label: 'Body font', hint: 'Paragraphs & reading text' },
  { role: 'nav', label: 'Navigation font', hint: 'Menus, tabs & labels' },
];

// Map the branding payload → the screen's editable shape.
function toForm(b = {}) {
  return {
    displayName: b.displayName || '',
    tagline: b.tagline || '',
    theme: b.theme === 'dark' ? 'dark' : 'light',
    colors: { ...(b.colors || {}) },
    logos: { full: b.logos?.full || '', mark: b.logos?.mark || '', markDark: b.logos?.markDark || '', header: b.logos?.header || '' },
    faviconUrl: b.faviconUrl || '',
    design: resolveDesign(b.design),
  };
}

// A template's palette: its own colour theme, or the current colours when it keeps them (Classic).
function templatePalette(tpl, currentColors) {
  if (!tpl.colorThemeId) return currentColors;
  return getThemeById(tpl.colorThemeId)?.colors || currentColors;
}

/* ── A tiny visual of a template: its palette + heading/body font + shape ───── */
function TemplateThumb({ tpl, colors }) {
  const heading = (FONT_MAP[tpl.fonts.heading] || FONT_MAP.inter).stack;
  const body = (FONT_MAP[tpl.fonts.body] || FONT_MAP.inter).stack;
  const r = ROUNDNESS_MAP[tpl.shape.roundness]?.vars || {};
  const bw = BORDER_WIDTH_MAP[tpl.shape.borderWidth]?.vars?.['--border-width'] || '1px';
  const sh = SHADOW_MAP[tpl.shape.shadow]?.vars?.['--card-shadow'] || 'none';
  const cardRadius = r['--radius-card'] || '8px';
  const btnRadius = r['--radius-btn'] || '6px';
  return (
    <div className="h-[92px] w-full overflow-hidden p-2.5" style={{ background: colors.background }}>
      <div
        className="flex h-full w-full flex-col justify-center px-2.5"
        style={{ background: colors.card || '#ffffff', borderRadius: cardRadius, border: `${bw} solid ${colors.border || '#e5e7eb'}`, boxShadow: sh }}
      >
        <div style={{ fontFamily: heading, color: colors.primary, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>Aa</div>
        <div style={{ fontFamily: body, color: colors.mutedForeground || '#6b7280', fontSize: 8, marginTop: 3 }}>The quick brown fox</div>
        <div className="mt-2 flex items-center gap-1.5">
          <span style={{ background: colors.accent, borderRadius: btnRadius, width: 30, height: 10 }} />
          <span style={{ border: `${bw} solid ${colors.primary}`, borderRadius: btnRadius, width: 18, height: 10 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Visual shape picker — each option shows a live sample of that shape ─────── */
function ShapePicker({ options, value, onChange, kind }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((o) => {
        const active = value === o.id;
        const v = o.vars || {};
        let sample = {};
        if (kind === 'corners') sample = { borderRadius: v['--radius-card'], border: '2px solid var(--color-mutedForeground)', background: 'var(--color-muted)' };
        else if (kind === 'borders') sample = { borderRadius: '8px', borderStyle: 'solid', borderWidth: v['--border-width'], borderColor: 'var(--color-mutedForeground)', background: 'var(--color-muted)' };
        else sample = { borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-card)', boxShadow: v['--card-shadow'] };
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn('flex w-[88px] flex-col items-center gap-2 rounded-card border-2 p-3 transition-all', active ? 'border-accent' : 'border-border hover:border-accent/50')}
            style={active ? { backgroundColor: 'rgba(var(--color-accent-rgb), 0.06)' } : undefined}
          >
            <span className="grid h-10 w-full place-items-center">
              <span className="h-8 w-12" style={sample} />
            </span>
            <span className={cn('text-xs font-medium', active ? 'text-accent' : 'text-muted-foreground')}>{o.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Small segmented control ───────────────────────────────────────────────── */
function Segmented({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-btn border px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.id ? 'border-accent text-accent' : 'border-border text-muted-foreground hover:bg-muted',
          )}
          style={value === o.id ? { backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)' } : undefined}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

/* ── Integrated header stat (same recipe as the Courses header) ─────────────── */
function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-accent" style={accentTint(0.1)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function BrandingSettingsPage() {
  // Branding is already fetched app-wide by <BrandingProvider> (it blocks first paint until it
  // resolves), so we seed the editor straight from context — no extra round-trip, no loading spinner.
  const { branding, tenant, updateBranding } = useBranding();
  const { theme } = useAdminUi();

  const initialForm = useMemo(() => toForm(branding || {}), [branding]);
  const [form, setForm] = useState(initialForm);
  const [section, setSection] = useState('identity');
  const [activeThemeCategory, setActiveThemeCategory] = useState(
    () => getThemeById(initialForm.design?.colorThemeId)?.categoryId || 'warm',
  );
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const orgName = tenant?.name || '';

  // Last-saved snapshot + its serialized form — the dirty check compares the live form against this
  // string, so we only ever serialize the form once per change (see `isDirty`).
  const savedRef = useRef(initialForm);
  const savedJson = useRef(JSON.stringify(initialForm));

  // Live apply — changes take effect across the real portal as you edit (no separate preview).
  // rAF-batched so a burst of updates (e.g. dragging a colour picker) collapses to one re-theme/frame.
  const rafRef = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => applyBranding(form));
    return () => cancelAnimationFrame(rafRef.current);
  }, [form]);

  // Leaving without saving restores the last-saved branding so an unsaved edit doesn't stick.
  useEffect(() => () => applyBranding(savedRef.current), []);

  // Preload every template's fonts so the template thumbnails render in the right typeface.
  useEffect(() => {
    TEMPLATES.forEach((t) => {
      loadFontById(t.fonts.heading);
      loadFontById(t.fonts.body);
    });
  }, []);

  // When the Typography section is open, load every curated font so the dropdowns + samples
  // render in their actual typeface.
  useEffect(() => {
    if (section === 'typography') FONTS.forEach((f) => loadFontById(f.id));
  }, [section]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setColor = (token, val) => setForm((f) => ({ ...f, colors: { ...f.colors, [token]: val }, design: { ...f.design, colorThemeId: null } }));
  const setShape = (patch) => setForm((f) => ({ ...f, design: { ...f.design, shape: { ...f.design.shape, ...patch }, templateId: null } }));
  const setFont = (role, id) => {
    loadFontById(id);
    setForm((f) => ({ ...f, design: { ...f.design, fonts: { ...f.design.fonts, [role]: id }, templateId: null } }));
  };

  const applyPreset = (themeId) => {
    const preset = getThemeById(themeId);
    if (!preset) return;
    setForm((f) => ({ ...f, colors: { ...preset.colors }, design: { ...f.design, colorThemeId: themeId } }));
  };

  const applyTemplate = (tpl) => {
    setForm((f) => {
      const next = { ...f, design: { ...f.design, templateId: tpl.id, fonts: { ...tpl.fonts }, shape: { ...tpl.shape }, colorThemeId: tpl.colorThemeId ?? f.design.colorThemeId } };
      if (tpl.colorThemeId) {
        const preset = getThemeById(tpl.colorThemeId);
        if (preset) next.colors = { ...preset.colors };
      }
      return next;
    });
    Object.values(tpl.fonts).forEach(loadFontById);
  };

  const resetAppearance = () => {
    const def = getThemeById('default');
    setForm((f) => ({
      ...f,
      theme: 'light',
      colors: { ...def.colors },
      design: { templateId: 'classic', colorThemeId: 'default', fonts: { ...DEFAULT_DESIGN.fonts }, shape: { ...DEFAULT_DESIGN.shape } },
    }));
    setActiveThemeCategory('warm');
    toast('Reset to default appearance', { icon: '↩️' });
  };

  // Serialize the live form once per change and compare to the cached saved snapshot string.
  const isDirty = useMemo(() => JSON.stringify(form) !== savedJson.current, [form]);

  // Current appearance at a glance — feeds the header stats strip.
  const summary = useMemo(() => ({
    palette: getThemeById(form.design.colorThemeId)?.name || 'Custom',
    font: FONTS.find((f) => f.id === form.design.fonts.heading)?.name || '—',
    corners: ROUNDNESS.find((r) => r.id === form.design.shape.roundness)?.name || '—',
    template: TEMPLATES.find((t) => t.id === form.design.templateId)?.name || 'Custom',
  }), [form.design]);

  const uploadAsset = async (slot, file) => {
    setUploadingSlot(slot);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', slot);
      const res = await apiUpload(`/tenant/branding/asset?type=${slot}`, fd);
      const url = res.url || res.data?.url;
      if (!url) throw new Error('No URL returned');
      if (slot === 'favicon') setField('faviconUrl', url);
      else setForm((f) => ({ ...f, logos: { ...f.logos, [SLOT_FIELD[slot]]: url } }));
      toast.success('Image uploaded — Save to apply');
    } catch (e) {
      toast.error(e.message || 'Failed to upload image');
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeAsset = (slot) => {
    if (slot === 'favicon') setField('faviconUrl', '');
    else setForm((f) => ({ ...f, logos: { ...f.logos, [SLOT_FIELD[slot]]: '' } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const colors = Object.fromEntries(Object.entries(form.colors).filter(([, v]) => v && String(v).trim()));
      const res = await apiPut('/tenant/branding', {
        displayName: form.displayName,
        tagline: form.tagline,
        theme: form.theme,
        colors,
        logos: form.logos,
        faviconUrl: form.faviconUrl,
        design: form.design,
      });
      const saved = res.branding;
      const nf = toForm(saved);
      savedRef.current = nf;
      savedJson.current = JSON.stringify(nf);
      setForm(nf);
      // Publish to the shared context → sidebar/header logos, title & favicon refresh in place.
      // No full-page reload, so the editor keeps its scroll/section and there's no white flash.
      updateBranding(saved);
      toast.success('Branding saved');
    } catch (e) {
      toast.error(e.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    setForm(savedRef.current);
    applyBranding(savedRef.current);
    toast('Reverted unsaved changes', { icon: '↩️' });
  };

  return (
    <>
      <div className="w-full space-y-6 pb-24 text-foreground">
        {/* Header card — gradient band + integrated appearance summary (mirrors the Courses header) */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: GRADIENT }}>
            {/* decorative motif */}
            <SwatchBook className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 rotate-12 text-white/10" />
            <Shapes className="pointer-events-none absolute -bottom-10 right-24 h-32 w-32 -rotate-12 text-white/[0.07]" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Appearance</p>
                <h1 className="mt-0.5 text-2xl font-bold text-white">Portal Branding</h1>
                <p className="mt-1 max-w-xl text-sm text-white/80">Edit your logos, colours, fonts and shape — changes apply live across the portal and persist on Save.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {section !== 'identity' ? (
                  <Button variant="white" icon={RefreshCw} onClick={resetAppearance} title="Reset palette, fonts & shape to default" className="active:scale-95">Reset</Button>
                ) : null}
                <Button variant="white" icon={Check} loading={saving} disabled={!isDirty} onClick={save} className="active:scale-95">
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
            <HeaderStat icon={SwatchBook} label="Palette" value={summary.palette} />
            <HeaderStat icon={Type} label="Heading font" value={summary.font} />
            <HeaderStat icon={Shapes} label="Corners" value={summary.corners} />
            <HeaderStat icon={LayoutTemplate} label="Template" value={summary.template} />
          </div>
        </div>

        {/* Tab rail + content */}
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <TabRail tabs={SECTIONS} value={section} onChange={setSection} layoutId="brandingTabActive" />

          <div className="rounded-card border border-border bg-card p-6 shadow-card lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                {/* IDENTITY */}
                {section === 'identity' && (
                  <div className="space-y-8">
                    <SectionHead icon={ImageIcon} title="Brand identity" desc="Your app name, logos, icon and favicon — shown across your portal and the browser tab. Add light and dark variants so everything stays legible on every surface." />
                    <Field label="App name" hint="Shown in the browser tab and across your portal. Leave blank to use your organisation name.">
                      <TextInput value={form.displayName} onChange={(e) => setField('displayName', e.target.value)} maxLength={80} placeholder={orgName || 'e.g., Calcite Grammar'} />
                    </Field>
                    <div className="space-y-7">
                      <div>
                        <h3 className="mb-1 text-sm font-semibold text-foreground">Full logo</h3>
                        <p className="mb-4 text-xs text-muted-foreground">Shown in the sidebar and header.</p>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <Dropzone label="Light logo · for dark backgrounds" hint="Light/white version for the sidebar & dark headers." previewBg="dark" value={form.logos.full} busy={uploadingSlot === 'full'} onUpload={(file) => uploadAsset('full', file)} onRemove={() => removeAsset('full')} wide />
                          <Dropzone label="Header logo · for light backgrounds" hint="Dark version for a light header." previewBg="light" value={form.logos.header} busy={uploadingSlot === 'header'} onUpload={(file) => uploadAsset('header', file)} onRemove={() => removeAsset('header')} wide />
                        </div>
                      </div>
                      <div className="border-t border-border pt-7">
                        <h3 className="mb-1 text-sm font-semibold text-foreground">Icon mark</h3>
                        <p className="mb-4 text-xs text-muted-foreground">The compact square mark for the collapsed sidebar and small surfaces. Add a light and a dark version.</p>
                        <div className="grid gap-6 sm:grid-cols-2">
                          <Dropzone label="Light icon · for dark backgrounds" hint="For the collapsed (dark) sidebar. Square, 64×64px+." previewBg="dark" value={form.logos.mark} busy={uploadingSlot === 'mark'} onUpload={(file) => uploadAsset('mark', file)} onRemove={() => removeAsset('mark')} />
                          <Dropzone label="Dark icon · for light backgrounds" hint="For light surfaces. Square, 64×64px+." previewBg="light" value={form.logos.markDark} busy={uploadingSlot === 'markDark'} onUpload={(file) => uploadAsset('markDark', file)} onRemove={() => removeAsset('markDark')} />
                        </div>
                      </div>
                      <div className="border-t border-border pt-7">
                        <div className="mb-1 flex items-center gap-2">
                          <Star className="h-4 w-4 text-accent" />
                          <h3 className="text-sm font-semibold text-foreground">Favicon</h3>
                        </div>
                        <p className="mb-4 text-xs text-muted-foreground">The little icon shown on the browser tab and in bookmarks.</p>
                        <div className="max-w-xs">
                          <Dropzone label="Favicon image" hint="Square PNG, SVG or ICO. 32–48px works best." value={form.faviconUrl} busy={uploadingSlot === 'favicon'} onUpload={(file) => uploadAsset('favicon', file)} onRemove={() => removeAsset('favicon')} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PALETTE */}
                {section === 'palette' && (
                  <div className="space-y-8">
                    <SectionHead icon={SwatchBook} title="Palette & colours" desc="Pick a ready-made palette, then fine-tune any colour. Changes apply live across the portal." />
                    <div>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-foreground">Ready-made palettes</h3>
                        <Segmented options={[{ id: 'light', name: 'Light' }, { id: 'dark', name: 'Dark' }]} value={form.theme} onChange={(v) => setField('theme', v)} />
                      </div>
                      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
                        {themeCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setActiveThemeCategory(cat.id)}
                            className={cn('whitespace-nowrap rounded-btn px-3 py-1.5 text-xs font-medium transition-colors', activeThemeCategory === cat.id ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:opacity-80')}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                      <div className="scrollbar-none grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                        {themeCategories.find((c) => c.id === activeThemeCategory)?.themes.map((theme) => {
                          const selected = form.design.colorThemeId === theme.id;
                          return (
                            <button key={theme.id} onClick={() => applyPreset(theme.id)} className={cn('relative rounded-card border-2 p-3 text-left transition-all', selected ? 'border-accent' : 'border-border hover:opacity-90')}>
                              {selected ? (
                                <div className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-pill bg-accent">
                                  <Check className="h-2.5 w-2.5 text-accent-foreground" />
                                </div>
                              ) : null}
                              <div className="mb-1.5 flex gap-1">
                                <span className="h-5 w-5 rounded-pill border border-border" style={{ backgroundColor: theme.colors.primary }} />
                                <span className="h-5 w-5 rounded-pill border border-border" style={{ backgroundColor: theme.colors.accent }} />
                                <span className="h-5 w-5 rounded-pill border border-border" style={{ backgroundColor: theme.colors.background }} />
                              </div>
                              <p className="truncate text-xs font-medium text-foreground">{theme.name}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-border pt-7">
                      <h3 className="text-sm font-semibold text-foreground">Custom colours</h3>
                      <p className="mb-4 mt-0.5 text-xs text-muted-foreground">Override any individual token.</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(form.colors).map(([token, value]) => (
                          <label key={token} className="flex items-center gap-2.5 rounded-card border border-border p-2">
                            <input
                              type="color"
                              value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                              onChange={(e) => setColor(token, e.target.value)}
                              className="h-9 w-9 shrink-0 cursor-pointer rounded-btn border border-border bg-transparent p-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-foreground">{humanize(token)}</span>
                              <input value={value} onChange={(e) => setColor(token, e.target.value)} className="w-full bg-transparent font-mono text-[11px] uppercase text-muted-foreground outline-none" maxLength={7} />
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TYPOGRAPHY */}
                {section === 'typography' && (
                  <div className="space-y-6">
                    <SectionHead icon={Type} title="Typography" desc="Choose fonts for headings, body text and navigation. Each option previews in its own typeface and applies across the whole portal." />
                    <div className="space-y-4">
                      {TYPO_ROLES.map(({ role, label, hint }) => {
                        const stack = (FONT_MAP[form.design.fonts[role]] || FONT_MAP.inter).stack;
                        return (
                          <div key={role} className="grid items-center gap-4 rounded-card border border-border p-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
                            <Field label={label} hint={hint}>
                              <CustomSelect
                                value={form.design.fonts[role]}
                                onChange={(id) => setFont(role, id)}
                                options={fontsForRole(role).map((f) => ({ value: f.id, label: f.name, font: f.stack }))}
                                placeholder="Choose a font"
                                searchPlaceholder="Search fonts…"
                              />
                            </Field>
                            <div className="min-w-0 rounded-card bg-muted/50 px-4 py-3" style={{ fontFamily: stack }}>
                              <p className="text-2xl font-bold leading-none text-foreground">Aa Bb Cc</p>
                              <p className="mt-1.5 truncate text-sm text-muted-foreground">The quick brown fox jumps over the lazy dog</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SHAPE */}
                {section === 'shape' && (
                  <div className="space-y-6">
                    <SectionHead icon={Shapes} title="Shape" desc="Corner roundness, border weight and shadow for cards, buttons and inputs across the portal. Each option shows a live sample." />
                    <div className="space-y-7">
                      <Field label="Corners"><ShapePicker kind="corners" options={ROUNDNESS} value={form.design.shape.roundness} onChange={(v) => setShape({ roundness: v })} /></Field>
                      <Field label="Borders"><ShapePicker kind="borders" options={BORDER_WIDTH} value={form.design.shape.borderWidth} onChange={(v) => setShape({ borderWidth: v })} /></Field>
                      <Field label="Card shadow"><ShapePicker kind="shadow" options={SHADOW} value={form.design.shape.shadow} onChange={(v) => setShape({ shadow: v })} /></Field>
                    </div>
                  </div>
                )}

                {/* TEMPLATES */}
                {section === 'templates' && (
                  <div className="space-y-6">
                    <SectionHead icon={LayoutTemplate} title="Templates" desc="One-tap starting points — each sets a palette, fonts and shape together. The preview shows the look; fine-tune anything afterwards." />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {TEMPLATES.map((tpl) => {
                        const selected = form.design.templateId === tpl.id;
                        const pal = templatePalette(tpl, form.colors);
                        return (
                          <button
                            key={tpl.id}
                            onClick={() => applyTemplate(tpl)}
                            className={cn(
                              'group relative overflow-hidden rounded-card border-2 text-left transition-all',
                              selected ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-accent/50',
                            )}
                          >
                            {selected ? (
                              <div className="absolute right-2 top-2 z-10 grid h-5 w-5 place-items-center rounded-pill bg-accent shadow-card">
                                <Check className="h-3 w-3 text-accent-foreground" />
                              </div>
                            ) : null}
                            <TemplateThumb tpl={tpl} colors={pal} />
                            <div className="border-t border-border bg-card px-3.5 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
                                <div className="flex shrink-0 gap-1">
                                  {[pal.primary, pal.accent, pal.background].map((c, i) => (
                                    <span key={i} className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: c }} />
                                  ))}
                                </div>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tpl.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Sticky unsaved-changes bar — portaled to <body> so it centres on the viewport (screen),
          not the sidebar-offset content area. */}
      {typeof document !== 'undefined'
        ? createPortal(
            <div data-admin-theme={theme}>
              <AnimatePresence>
                {isDirty && !saving ? (
                  <motion.div
                    initial={{ y: 80, x: '-50%', opacity: 0 }}
                    animate={{ y: 0, x: '-50%', opacity: 1 }}
                    exit={{ y: 80, x: '-50%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className="fixed bottom-5 left-1/2 z-[60] flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-card"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="h-2 w-2 animate-pulse rounded-pill bg-accent" />
                      Unsaved changes — applied live, not yet saved
                    </span>
                    <button onClick={discard} className="flex items-center gap-1.5 rounded-btn px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
                      <RotateCcw className="h-3.5 w-3.5" /> Discard
                    </button>
                    <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-btn bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save changes
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default BrandingSettingsPage;
