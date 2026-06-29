const mongoose = require('mongoose');
const { Schema } = mongoose;

// A tenant (school/org). `branding` is a free-form object layered over DEFAULT_BRANDING at read time.
// Logo/favicon fields inside `branding` store S3 object KEYS, signed to URLs when served.
const tenantSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    branding: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Tenant', tenantSchema);
