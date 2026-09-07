/**
 * Very small file-based "database" for demo/learning purposes.
 * Every user record lives in data/users.json as a plain JSON array.
 *
 * All storage access is isolated to this file on purpose — if you later
 * want to swap this out for PostgreSQL, MySQL, MongoDB, etc., this is the
 * only file you need to rewrite. Every route/middleware calls these
 * functions instead of touching the filesystem directly.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '[]', 'utf-8');
}

function readUsers() {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('users.json is corrupted or unreadable, starting fresh:', err.message);
    return [];
  }
}

function writeUsers(users) {
  ensureDbFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

function findUserByEmail(email) {
  if (!email) return undefined;
  return readUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserByUsername(username) {
  if (!username) return undefined;
  return readUsers().find((u) => u.username.toLowerCase() === String(username).toLowerCase());
}

function findUserById(id) {
  return readUsers().find((u) => u.id === id);
}

function createUser(user) {
  const users = readUsers();
  users.push(user);
  writeUsers(users);
  return user;
}

function updateUser(id, updates) {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  writeUsers(users);
  return users[idx];
}

module.exports = {
  readUsers,
  writeUsers,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
};
