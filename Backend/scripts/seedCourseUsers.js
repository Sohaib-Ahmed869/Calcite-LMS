// Seed an admin + two students for the Course service. Idempotent (upserts by email).
// Run with: npm run seed:course
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const USERS = [
  {
    firstName: 'Avery',
    lastName: 'Quinn',
    email: 'admin@calcite.test',
    password: 'admin123',
    roles: ['admin'],
    phone: '+61 400 123 456',
    country: 'Australia',
    address: { street: '12 Burnett Lane', city: 'Brisbane', state: 'QLD', postalCode: '4000' },
  },
  { firstName: 'Sam', lastName: 'Rivera', email: 'student1@calcite.test', password: 'student123', roles: ['student'] },
  { firstName: 'Riya', lastName: 'Patel', email: 'student2@calcite.test', password: 'student123', roles: ['student'] },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/calcite_courses');
    for (const u of USERS) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        existing.firstName = u.firstName;
        existing.lastName = u.lastName;
        existing.roles = u.roles;
        existing.password = u.password; // re-hashed by the pre-save hook
        existing.isActive = true;
        if (u.phone !== undefined) existing.phone = u.phone;
        if (u.country !== undefined) existing.country = u.country;
        if (u.address !== undefined) existing.address = u.address;
        await existing.save();
        console.log(`updated  ${u.email} (${u.roles.join(', ')})`);
      } else {
        await User.create(u);
        console.log(`created  ${u.email} (${u.roles.join(', ')})`);
      }
    }
    console.log('\nDone. Passwords: admin123 / student123');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
