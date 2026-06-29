/**
 * A tiny JSON-file "database" for the branding subsystem. Deliberately dependency-free so branding
 * runs with zero external services (the course subsystem uses MongoDB separately).
 *
 * Shape:
 *   { tenants: [{ code, name, branding }], users: [{ id, tenantCode, email, passwordHash, ... }] }
 *
 * The file is seeded on first read with demo tenants + admin users (see seedData()).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { dataFile } = require('../config/brandingConfig');
const { DEFAULT_BRANDING } = require('../config/brandingDefaults');

function seedData() {
  return {
    tenants: [
      {
        code: 'calcite',
        name: 'Calcite LMS',
        // Empty branding override → the API serves DEFAULT_BRANDING until the admin edits it.
        branding: {},
      },
      {
        code: 'northwood',
        name: 'Northwood Academy',
        // A second tenant pre-themed differently, to show off X-Tenant-Code resolution.
        branding: {
          displayName: 'Northwood Academy',
          design: { colorThemeId: 'nature-forest', templateId: null },
          colors: {
            primary: '#1b4332',
            accent: '#40916c',
            background: '#f0fff4',
            foreground: '#1b4332',
            sidebar: '#1a3a2a',
            ring: '#40916c',
          },
        },
      },
    ],
    users: [
      {
        id: crypto.randomUUID(),
        tenantCode: 'calcite',
        email: 'admin@calcite.test',
        passwordHash: bcrypt.hashSync('admin123', 10),
        displayName: 'Avery Quinn',
        firstName: 'Avery',
        lastName: 'Quinn',
        phone: '+61 400 123 456',
        country: 'Australia',
        address: { street: '12 Burnett Lane', city: 'Brisbane', state: 'QLD', postalCode: '4000' },
        role: 'admin',
        profileImage: '',
        createdAt: '2025-01-15T09:00:00.000Z',
        passwordSetAt: '2025-01-15T09:00:00.000Z',
      },
      {
        id: crypto.randomUUID(),
        tenantCode: 'northwood',
        email: 'admin@northwood.test',
        passwordHash: bcrypt.hashSync('admin123', 10),
        displayName: 'Jordan Lee',
        firstName: 'Jordan',
        lastName: 'Lee',
        phone: '',
        country: 'New Zealand',
        address: { street: '', city: '', state: '', postalCode: '' },
        role: 'admin',
        profileImage: '',
        createdAt: '2025-02-03T10:30:00.000Z',
        passwordSetAt: '2025-02-03T10:30:00.000Z',
      },
    ],
  };
}

function ensureFile() {
  if (!fs.existsSync(dataFile)) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(seedData(), null, 2));
  }
}

function read() {
  ensureFile();
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function write(db) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  return db;
}

/** Apply a mutator to the store and persist the result atomically (read → mutate → write). */
function update(mutator) {
  const db = read();
  const result = mutator(db);
  write(db);
  return result;
}

function findTenant(code) {
  return read().tenants.find((t) => t.code === code) || null;
}

function findUserByEmail(tenantCode, email) {
  const e = String(email || '').toLowerCase();
  return read().users.find((u) => u.tenantCode === tenantCode && u.email.toLowerCase() === e) || null;
}

function findUserById(id) {
  return read().users.find((u) => u.id === id) || null;
}

module.exports = {
  read,
  write,
  update,
  findTenant,
  findUserByEmail,
  findUserById,
  DEFAULT_BRANDING,
};

// `node services/brandingStore.js --seed` — force (re)create the store file.
if (require.main === module && process.argv.includes('--seed')) {
  write(seedData());
  // eslint-disable-next-line no-console
  console.log(`Seeded ${dataFile}`);
}
