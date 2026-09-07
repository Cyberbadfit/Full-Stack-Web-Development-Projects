/**
 * Promotes an existing user to the 'admin' role.
 * Deliberately NOT exposed through the website itself — role escalation
 * should never be something the public registration form can grant.
 *
 * Usage:
 *   node scripts/make-admin.js someone@example.com
 *   npm run make-admin -- someone@example.com
 */

const db = require('../config/database');

const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/make-admin.js <email>');
  process.exit(1);
}

const user = db.findUserByEmail(email);

if (!user) {
  console.log(`No user found with email: ${email}`);
  console.log('Register the account on the site first, then run this script.');
  process.exit(1);
}

db.updateUser(user.id, { role: 'admin' });
console.log(`✔ ${user.username} (${user.email}) is now an admin.`);
