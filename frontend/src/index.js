import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
// Bootstrap is still imported in App.js for unmigrated pages; no need to
// duplicate it here. main.css was the legacy global theme that hard-coded
// body { color: #212529; font-family: Roboto } and conflicted with the
// new Tailwind/Geist design tokens — removing it. Migrated pages own
// their styling; pages still on Bootstrap fall back to bootstrap defaults.
// Sentry must initialize before any React render so it can capture
// errors from the very first paint.
import Sentry from './sentry';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div style={{ padding: 24, fontFamily: 'system-ui' }}>
          <h2>Something broke.</h2>
          <p>The team has been notified. Try reloading.</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.unregister();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();


