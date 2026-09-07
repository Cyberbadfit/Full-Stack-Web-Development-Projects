/**
 * Route guards.
 * req.session.user is only ever set after a verified login (see routes/auth.js),
 * so its presence is what "authenticated" means throughout this app.
 */

function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Please log in to access that page.');
  return res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'You do not have permission to access that page.');
  return res.redirect('/dashboard');
}

// Keeps logged-in users from seeing /login or /register again
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  next();
}

module.exports = { isAuthenticated, isAdmin, redirectIfAuthenticated };
