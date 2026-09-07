const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', {
    title: 'SecureAuth — A Properly Locked-Down Auth System',
    description:
      'A modern, secure authentication starter with bcrypt password hashing, protected sessions, rate limiting and role-based access control.',
  });
});

module.exports = router;
