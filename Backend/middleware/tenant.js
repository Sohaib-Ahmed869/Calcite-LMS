const Tenant = require('../models/Tenant');
const { defaultTenant } = require('../config/brandingConfig');

/**
 * Resolve the tenant for this request from the `X-Tenant-Code` header (default DEFAULT_TENANT),
 * now backed by MongoDB. The default tenant is auto-created on first hit so a fresh deploy works
 * without a manual seed. Attaches a lean `req.tenant` ({ code, name, branding }).
 */
async function resolveTenant(req, res, next) {
  try {
    const code = (req.get('X-Tenant-Code') || defaultTenant).trim().toLowerCase();
    let tenant = await Tenant.findOne({ code }).lean();
    if (!tenant && code === defaultTenant) {
      const created = await Tenant.create({ code, name: 'Calcite LMS', branding: {} });
      tenant = created.toObject();
    }
    if (!tenant) return res.status(404).json({ error: `Unknown tenant: ${code}` });
    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveTenant };
