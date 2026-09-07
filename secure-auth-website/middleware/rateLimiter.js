const rateLimit = require('express-rate-limit');

// Throttles login/register attempts per IP address.
// Works alongside the per-account lockout in routes/auth.js — this stops
// an attacker from hammering many different accounts from one machine,
// while the per-account lockout stops repeated guesses at one account.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many attempts from this device. Please wait a while and try again.',
});

module.exports = { authLimiter };
