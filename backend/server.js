require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const pool = require('./db/pool');
const { loginRateLimit } = require('./middleware/rateLimit');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const accountRoutes = require('./routes/account');
const transferRoutes = require('./routes/transfer');
const transactionRoutes = require('./routes/transactions');
const securityRoutes = require('./routes/security');

const {
  loadSecurityConfig,
  getSecurityConfig,
} = require('./security/securityConfig');

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.set('trust proxy', 1);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

/*
 * Configure the session after the Security Center configuration
 * has been loaded, but BEFORE any authenticated routes are attached.
 */
function configureSession() {
  const config = getSecurityConfig();

  app.use(
    session({
      store: new pgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: false,
      }),
      name: 'securebank.sid',
      secret:
        process.env.SESSION_SECRET ||
        'dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 4,
      },
    })
  );

  // Apply security headers dynamically based on Security Center setting.
  app.use((req, res, next) => {
    const config = getSecurityConfig();

    if (config.securityHeaders) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'no-referrer');

      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
      );
    } else {
      res.removeHeader('X-Content-Type-Options');
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Referrer-Policy');
      res.removeHeader('Content-Security-Policy');
    }

    next();
  });
  // Apply the current Security Center session settings
  // to every active session dynamically.
  app.use((req, res, next) => {
    const currentConfig = getSecurityConfig();

    if (req.session && req.session.cookie) {
      req.session.cookie.httpOnly = currentConfig.secureCookies;
      req.session.cookie.sameSite = currentConfig.secureCookies
        ? 'lax'
        : false;
      req.session.cookie.secure =
        isProduction && currentConfig.secureCookies;
    }

    next();
  });
}

/*
 * Attach all application routes AFTER session middleware.
 */
function configureRoutes() {
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'securebank-backend',
    });
  });

  app.use('/api/auth/login', loginRateLimit);
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/transfer', transferRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/security', securityRoutes);

  // 404 handler
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'Not found',
    });
  });

  // Centralized error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
      error: 'Internal server error',
    });
  });
}

async function start() {
  try {
    /*
     * 1. Load the persisted Security Center configuration.
     */
    await loadSecurityConfig();

    /*
     * 2. Configure sessions.
     */
    configureSession();

    /*
     * 3. ONLY NOW attach routes.
     */
    configureRoutes();

    /*
     * 4. Start the server.
     */
    app.listen(PORT, () => {
      console.log(
        `SecureBank backend listening on port ${PORT}`
      );
    });
  } catch (err) {
    console.error(
      'Failed to start server:',
      err
    );

    process.exit(1);
  }
}

start();

module.exports = app;