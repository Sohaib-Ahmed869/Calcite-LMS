const db = require('../services/brandingStore');
const { defaultTenant } = require('../config/brandingConfig');
function resolveTenant(req, res, next) {
  const code = (req.get('X-Tenant-Code') || defaultTenant).trim().toLowerCase();
  const tenant = db.findTenant(code);
  if (!tenant) {
    return res.status(404).json({ error: `Unknown tenant: ${code}` });
  }
  req.tenant = tenant;
  next();
}

module.exports = { resolveTenant };
