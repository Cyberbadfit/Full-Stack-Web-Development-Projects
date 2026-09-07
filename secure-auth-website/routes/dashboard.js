const express = require('express');
const router = express.Router();

const db = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Any logged-in user
router.get('/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard — SecureAuth',
    description: 'Your personal SecureAuth dashboard.',
    user: req.session.user,
  });
});

// Logged-in AND role === 'admin' only
router.get('/admin', isAuthenticated, isAdmin, (req, res) => {
  const users = db.readUsers().map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));

  res.render('admin', {
    title: 'Admin Panel — SecureAuth',
    description: 'Manage users and review account activity.',
    user: req.session.user,
    users,
  });
});

module.exports = router;
