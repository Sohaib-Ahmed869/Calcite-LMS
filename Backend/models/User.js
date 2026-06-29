const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

// Postal address — embedded, no own _id.
const addressSchema = new Schema(
  {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    postalCode: { type: String, trim: true, default: '' },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    // Optional name shown across the portal; falls back to "First Last" when blank.
    displayName: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: '' },
    address: { type: addressSchema, default: () => ({}) },
    // S3 object key for the avatar; turned into a signed URL on read (never stored as a URL).
    avatar: { type: String, default: '' },
    roles: { type: [String], default: ['student'] },
    isActive: { type: Boolean, default: true },
    // When the password was last set/changed — drives the profile "Security" UI.
    passwordSetAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Hash the password whenever it changes, and stamp when it was (re)set.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordSetAt = new Date();
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

/** Effective name shown in the UI: the explicit displayName, else "First Last". */
userSchema.methods.fullName = function () {
  return (this.displayName && this.displayName.trim()) || [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
};

module.exports = mongoose.model('User', userSchema);
