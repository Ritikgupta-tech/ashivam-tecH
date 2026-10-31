import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Phase 3: Error Boundary component exists and implements required recovery mechanics', () => {
  const errorBoundaryPath = path.resolve(process.cwd(), 'src/components/ErrorBoundary.jsx');
  assert.ok(fs.existsSync(errorBoundaryPath), 'src/components/ErrorBoundary.jsx must exist');

  const content = fs.readFileSync(errorBoundaryPath, 'utf8');

  // Must define lifecycle methods for catching errors
  assert.ok(content.includes('getDerivedStateFromError'), 'ErrorBoundary must define getDerivedStateFromError');
  assert.ok(content.includes('componentDidCatch'), 'ErrorBoundary must define componentDidCatch');

  // Must provide recovery buttons
  assert.ok(content.includes('Try Again'), 'ErrorBoundary must provide a "Try Again" recovery action');
  assert.ok(content.includes('Reload Page'), 'ErrorBoundary must provide a "Reload Page" action');
  assert.ok(content.includes('Return to Home'), 'ErrorBoundary must provide a "Return to Home" action');

  // Zero emojis in fallback UI (SVG vectors only)
  assert.ok(content.includes('<svg'), 'ErrorBoundary must render accessible SVG vectors');
  assert.ok(!/[\u{1F300}-\u{1F9FF}]/u.test(content), 'ErrorBoundary must not contain emojis');
});

test('Phase 3: App.jsx mounts ErrorBoundary wrapping all application routes', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.jsx');
  const content = fs.readFileSync(appPath, 'utf8');

  assert.ok(content.includes("import ErrorBoundary from './components/ErrorBoundary'"), 'App.jsx must import ErrorBoundary');
  assert.ok(content.includes('<ErrorBoundary>'), 'App.jsx must wrap routes with <ErrorBoundary>');
  assert.ok(content.includes('</ErrorBoundary>'), 'App.jsx must close </ErrorBoundary>');
});

test('Phase 3: src/api.js implements single-flight refresh queue and CSRF headers', () => {
  const apiPath = path.resolve(process.cwd(), 'src/api.js');
  const content = fs.readFileSync(apiPath, 'utf8');

  // Single-flight queue coordination
  assert.ok(content.includes('refreshInFlightPromise'), 'src/api.js must maintain a single-flight refresh promise');
  assert.ok(content.includes('executeTokenRefresh'), 'src/api.js must coordinate refresh calls via executeTokenRefresh');

  // CSRF defense header
  assert.ok(content.includes("'X-Requested-With': 'XMLHttpRequest'"), 'src/api.js must attach X-Requested-With header to requests');

  // Session clearing on failure
  assert.ok(content.includes('clearToken()'), 'src/api.js must clear session on refresh exhaustion');
});
