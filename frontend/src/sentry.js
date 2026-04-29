// Sentry initialization. Imported once from index.js before <App/> renders.
//
// DSN unset -> Sentry SDK no-ops, so this is safe in local dev without a
// REACT_APP_SENTRY_DSN. Sample rates default to 10% in production and 100%
// in dev so a local error reproduces immediately while prod doesn't drown
// in transactions.
import * as Sentry from '@sentry/react';

const dsn = process.env.REACT_APP_SENTRY_DSN;
const env = process.env.REACT_APP_SENTRY_ENV || process.env.NODE_ENV || 'development';
const release = process.env.REACT_APP_VERSION || 'finora-frontend@local';

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    release,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Replay is disabled by default (privacy-sensitive on a finance app).
      // Enable later with maskAllText/blockAllMedia if you want session replay.
    ],
    tracesSampleRate: env === 'production' ? 0.1 : 1.0,
    // Don't send the user's email/auth header to Sentry breadcrumbs.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        if (breadcrumb.data && breadcrumb.data.request_headers) {
          delete breadcrumb.data.request_headers.Authorization;
        }
      }
      return breadcrumb;
    },
  });
}

export default Sentry;
