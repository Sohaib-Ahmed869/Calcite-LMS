const Tenant = require('../models/Tenant');
const { DEFAULT_BRANDING } = require('../config/brandingDefaults');
const { ok, fail, wrap } = require('../utils/http');
const { getSignedUrl, BUCKET } = require('../middleware/upload');

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Branding fields that hold an uploaded image (stored as an S3 key, served as a signed URL).
const LOGO_KEYS = ['full', 'mark', 'markDark', 'header'];

/** Deep-merge `override` onto `base` (plain objects only; arrays/scalars replace). */
function deepMerge(base, override) {
  if (!isObj(base)) return override;
  if (!isObj(override)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v;
  }
  return out;
}

/** A stored asset value → a displayable URL. S3 keys get signed; absolute/legacy URLs pass through. */
async function signAsset(v) {
  if (!v || typeof v !== 'string') return v || '';
  if (/^https?:\/\//i.test(v)) return v; // already an absolute URL (external)
  if (v.startsWith('/uploads/')) return v; // legacy local path (pre-migration)
  return (await getSignedUrl(v, 24 * 3600)) || '';
}

/** A submitted asset value → the value to store. Our signed S3 URLs collapse back to their key. */
function toKey(v) {
  if (!v || typeof v !== 'string') return v;
  if (!/^https?:\/\//i.test(v)) return v; // already a key / relative path
  try {
    const u = new URL(v);
    if (u.hostname.includes('amazonaws.com')) {
      let p = decodeURIComponent(u.pathname).replace(/^\//, '');
      if (p.startsWith(`${BUCKET}/`)) p = p.slice(BUCKET.length + 1); // path-style URLs
      return p;
    }
  } catch {
    /* fall through */
  }
  return v; // some other external URL — keep as-is
}

/** Defaults + tenant overrides, with logo/favicon keys turned into signed URLs for the client. */
async function resolveBrandingForClient(tenant) {
  const b = deepMerge(DEFAULT_BRANDING, tenant.branding || {});
  b.logos = b.logos || {};
  for (const k of LOGO_KEYS) b.logos[k] = await signAsset(b.logos[k]);
  b.faviconUrl = await signAsset(b.faviconUrl);
  return b;
}

/** Collapse any signed-S3 asset URLs in an incoming patch back to plain keys before persisting. */
function normalizePatchAssets(patch) {
  if (isObj(patch.logos)) {
    for (const k of LOGO_KEYS) if (patch.logos[k] !== undefined) patch.logos[k] = toKey(patch.logos[k]);
  }
  if (patch.faviconUrl !== undefined) patch.faviconUrl = toKey(patch.faviconUrl);
}

/** GET /api/tenant/branding — public; resolved by X-Tenant-Code. */
const getBranding = wrap(async (req, res) =>
  ok(res, { code: req.tenant.code, name: req.tenant.name, branding: await resolveBrandingForClient(req.tenant) }),
);

const ALLOWED = ['displayName', 'tagline', 'theme', 'colors', 'logos', 'faviconUrl', 'design'];

/** PUT /api/tenant/branding — persist the admin's edits (admin auth required). */
const updateBranding = wrap(async (req, res) => {
  const patch = {};
  for (const key of ALLOWED) if (req.body[key] !== undefined) patch[key] = req.body[key];
  normalizePatchAssets(patch);

  const tenant = await Tenant.findOne({ code: req.tenant.code });
  if (!tenant) return fail(res, 404, 'Tenant not found');
  tenant.branding = deepMerge(tenant.branding || {}, patch);
  tenant.markModified('branding'); // Mixed type needs an explicit dirty flag
  await tenant.save();

  return ok(res, { branding: await resolveBrandingForClient(tenant) });
});

/** POST /api/tenant/branding/asset?type=full|mark|markDark|header|favicon — multipart upload to S3. */
const uploadAsset = wrap(async (req, res) => {
  if (!req.file || !req.file.key) return fail(res, 400, 'No file uploaded');
  const key = req.file.key;
  const url = (await getSignedUrl(key, 24 * 3600)) || '';
  // Frontend stores `url` in the form; on Save it PUTs it back and we collapse it to `key` (toKey).
  return ok(res, { url, key, type: req.query.type || req.body.type || null }, 201);
});

module.exports = { getBranding, updateBranding, uploadAsset, resolveBranding: resolveBrandingForClient };
