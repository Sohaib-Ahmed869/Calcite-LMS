const db = require('../services/brandingStore');
const { DEFAULT_BRANDING } = require('../config/brandingDefaults');
const { uploadsPublicPath } = require('../config/brandingConfig');

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

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

/** The branding actually served to the client: defaults with the tenant's overrides layered on top. */
function resolveBranding(tenant) {
  return deepMerge(DEFAULT_BRANDING, tenant.branding || {});
}

/** GET /api/tenant/branding — public; resolved by X-Tenant-Code. */
function getBranding(req, res) {
  res.json({
    code: req.tenant.code,
    name: req.tenant.name,
    branding: resolveBranding(req.tenant),
  });
}

const ALLOWED = ['displayName', 'tagline', 'theme', 'colors', 'logos', 'faviconUrl', 'design'];

/** PUT /api/tenant/branding — persist the admin's edits (auth required). */
function updateBranding(req, res) {
  const patch = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const updated = db.update((store) => {
    const tenant = store.tenants.find((t) => t.code === req.tenant.code);
    tenant.branding = deepMerge(tenant.branding || {}, patch);
    return resolveBranding(tenant);
  });

  res.json({ branding: updated });
}

/** POST /api/tenant/branding/asset?type=full|mark|markDark|header|favicon — multipart upload. */
function uploadAsset(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // multer has already written the file; hand back the public URL to store in branding.
  const url = `${uploadsPublicPath}/${req.file.filename}`;
  res.status(201).json({ url, type: req.query.type || req.body.type || null });
}

module.exports = { getBranding, updateBranding, uploadAsset, resolveBranding };
