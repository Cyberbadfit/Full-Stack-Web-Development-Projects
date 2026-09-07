const { body } = require('express-validator');

const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3-20 characters long.')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores.'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.'),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match.');
    }
    return true;
  }),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = { registerValidators, loginValidators };
