const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

const db = require('../config/database');
const { registerValidators, loginValidators } = require('../middleware/validators');
const { redirectIfAuthenticated } = require('../middleware/auth');
const { verifyCsrfToken } = require('../middleware/csrf');
const { authLimiter } = require('../middleware/rateLimiter');

const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

const PAGE_META = {
  register: {
    title: 'Create Account — SecureAuth',
    description: 'Create a free SecureAuth account in seconds.',
  },
  login: {
    title: 'Log In — SecureAuth',
    description: 'Log in to your SecureAuth account.',
  },
};

// ---------- GET /register ----------
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', {
    ...PAGE_META.register,
    errors: [],
    formData: {},
  });
});

// ---------- POST /register ----------
router.post(
  '/register',
  authLimiter,
  redirectIfAuthenticated,
  verifyCsrfToken,
  registerValidators,
  async (req, res) => {
    const errors = validationResult(req);
    const { username, email, password } = req.body;

    const rerender = (status, errArray) =>
      res.status(status).render('register', {
        ...PAGE_META.register,
        errors: errArray,
        formData: { username, email },
      });

    if (!errors.isEmpty()) {
      return rerender(400, errors.array());
    }

    if (db.findUserByEmail(email)) {
      return rerender(400, [{ msg: 'An account with that email already exists.' }]);
    }

    if (db.findUserByUsername(username)) {
      return rerender(400, [{ msg: 'That username is already taken.' }]);
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);

      const newUser = {
        id: crypto.randomUUID(),
        username,
        email: email.toLowerCase(),
        passwordHash,
        role: 'user', // new accounts are never admin by default — see scripts/make-admin.js
        failedAttempts: 0,
        lockUntil: null,
        createdAt: new Date().toISOString(),
      };

      db.createUser(newUser);

      // Regenerate the session on privilege change (anonymous -> authenticated)
      // to prevent session fixation attacks.
      req.session.regenerate((err) => {
        if (err) {
          req.flash('error', 'Your account was created, but we could not log you in automatically. Please log in.');
          return res.redirect('/login');
        }
        req.session.user = { id: newUser.id, username: newUser.username, role: newUser.role };
        req.flash('success', `Welcome, ${newUser.username}! Your account has been created.`);
        res.redirect('/dashboard');
      });
    } catch (err) {
      console.error('Registration error:', err);
      rerender(500, [{ msg: 'Something went wrong. Please try again.' }]);
    }
  }
);

// ---------- GET /login ----------
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', {
    ...PAGE_META.login,
    errors: [],
    formData: {},
  });
});

// ---------- POST /login ----------
router.post(
  '/login',
  authLimiter,
  redirectIfAuthenticated,
  verifyCsrfToken,
  loginValidators,
  async (req, res) => {
    const errors = validationResult(req);
    const { email, password } = req.body;
    const genericError = 'Invalid email or password.'; // never reveal which part was wrong

    const rerender = (status, errArray) =>
      res.status(status).render('login', {
        ...PAGE_META.login,
        errors: errArray,
        formData: { email },
      });

    if (!errors.isEmpty()) {
      return rerender(400, errors.array());
    }

    try {
      const user = db.findUserByEmail(email);

      if (!user) {
        return rerender(400, [{ msg: genericError }]);
      }

      if (user.lockUntil && user.lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return rerender(423, [
          { msg: `Account temporarily locked from too many failed attempts. Try again in ${minutesLeft} minute(s).` },
        ]);
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
        const attempts = (user.failedAttempts || 0) + 1;
        const updates = { failedAttempts: attempts };
        if (attempts >= MAX_ATTEMPTS) {
          updates.lockUntil = Date.now() + LOCK_TIME_MS;
          updates.failedAttempts = 0;
        }
        db.updateUser(user.id, updates);
        return rerender(400, [{ msg: genericError }]);
      }

      // Successful login: reset any failed-attempt counter
      db.updateUser(user.id, { failedAttempts: 0, lockUntil: null });

      // Capture returnTo BEFORE regenerating — regenerate() clears the old session data.
      const redirectTo = req.session.returnTo || '/dashboard';

      req.session.regenerate((err) => {
        if (err) {
          req.flash('error', 'Something went wrong. Please try again.');
          return res.redirect('/login');
        }
        req.session.user = { id: user.id, username: user.username, role: user.role };
        req.flash('success', `Welcome back, ${user.username}!`);
        res.redirect(redirectTo);
      });
    } catch (err) {
      console.error('Login error:', err);
      rerender(500, [{ msg: 'Something went wrong. Please try again.' }]);
    }
  }
);

// ---------- POST /logout ----------
router.post('/logout', verifyCsrfToken, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/login');
  });
});

module.exports = router;
