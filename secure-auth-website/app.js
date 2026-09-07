require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const flash = require('connect-flash');
const morgan = require('morgan');

const { ensureCsrfToken } = require('./middleware/csrf');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ---------- View engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// If deployed behind a reverse proxy (nginx, Heroku, etc.) with HTTPS,
// uncomment this so secure cookies work correctly:
// app.set('trust proxy', 1);

// ---------- Security headers ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  })
);

// ---------- Logging (dev only) ----------
if (!isProd) app.use(morgan('dev'));

// ---------- Body parsing ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------- Static assets ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Sessions ----------
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd, // requires HTTPS in production
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

// ---------- Flash messages ----------
app.use(flash());

// ---------- CSRF tokens available to every view ----------
app.use(ensureCsrfToken);

// ---------- Shared template locals ----------
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.successMsg = req.flash('success');
  res.locals.errorMsg = req.flash('error');
  next();
});

// ---------- Routes ----------
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', dashboardRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found — SecureAuth',
    description: 'The page you are looking for could not be found.',
  });
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong on our end. Please try again shortly.');
});

app.listen(PORT, () => {
  console.log(`\n  SecureAuth is running → http://localhost:${PORT}\n`);
});
