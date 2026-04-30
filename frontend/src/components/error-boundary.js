import React from 'react';

/**
 * Top-level error boundary. Without this, a render error anywhere in
 * the app blanks the screen with React's default white-page-of-death.
 * This catches the throw, shows a branded fallback, and gives the user
 * a way to recover (reload) without losing the URL they were on.
 *
 * Sentry is wired separately at the SDK level via
 * Sentry.init({...}); the SDK auto-attaches to error boundaries when
 * `<Sentry.ErrorBoundary>` is used. We deliberately use a plain
 * boundary here so behaviour is consistent whether Sentry is enabled
 * or not — Sentry still reports via its global error handler.
 *
 * React 18 doesn't have a hooks API for this; class component is the
 * required pattern.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to console for local debugging; Sentry's global handler
    // captures it for production telemetry.
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background text-foreground">
        <div className="text-center max-w-md">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/15 grid place-items-center mb-6">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-2">
            Something broke on this page
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            A render error stopped the app. Reloading usually clears it. If you
            keep seeing this, the team has been notified through Sentry.
          </p>
          {/* Inline error message — useful in dev, neutral in prod. */}
          {process.env.NODE_ENV !== 'production' && this.state.error?.message && (
            <pre className="text-left text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 rounded-md p-3 mb-6 overflow-x-auto">
              {String(this.state.error.message)}
            </pre>
          )}
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="text-sm px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.reload}
              className="text-sm px-4 py-2 rounded-md bg-brand-gradient text-white shadow-md shadow-primary/30 hover:opacity-90"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
