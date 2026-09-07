/**
 * Minimal CSRF protection (synchronizer token pattern).
 * A random token is generated once per session and embedded as a hidden
 * field in every form. Every state-changing POST must echo it back.
 */

const crypto = require('crypto');

function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const tokenFromForm = req.body._csrf;
  const tokenFromSession = req.session.csrfToken;

  if (!tokenFromForm || !tokenFromSession || tokenFromForm !== tokenFromSession) {
    req.flash('error', 'Your form session expired. Please try again.');
    return res.redirect(req.get('Referer') || '/');
  }
  next();
}

module.exports = { ensureCsrfToken, verifyCsrfToken };
