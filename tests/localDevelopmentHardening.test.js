/**
 * localDevelopmentHardening.test.js
 *
 * Regression tests for:
 * 1. Vite proxy error handler configuration (Phase 1)
 * 2. Fast Refresh module layout — authContextDef.js decoupling (Phase 2)
 * 3. Navbar accessibility — focus management, aria-controls, inert, aria-hidden (Phase 3)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');

// ---------------------------------------------------------------------------
// PHASE 1 — Vite Proxy Error Handler
// ---------------------------------------------------------------------------

test('vite.config.js configures proxy with an error handler (configure callback)', () => {
  const configPath = path.join(ROOT, 'vite.config.js');
  assert.ok(fs.existsSync(configPath), 'vite.config.js must exist');

  const src = fs.readFileSync(configPath, 'utf8');

  assert.ok(
    src.includes("configure:") || src.includes("configure :"),
    'vite.config.js must include a proxy "configure" callback for error handling'
  );
  assert.ok(
    src.includes("proxy.on('error'") || src.includes('proxy.on("error"'),
    'proxy configure callback must register an "error" event handler'
  );
  assert.ok(
    src.includes('503') || src.includes('ECONNREFUSED'),
    'proxy error handler must handle ECONNREFUSED / return 503'
  );
  assert.ok(
    !src.includes('return { success: true }') && !src.includes('res.end(JSON.stringify({ success: true'),
    'proxy error handler must NOT fake a successful 2xx response'
  );
});

test('vite.config.js proxy target uses IPv4 loopback 127.0.0.1 (not ::1)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
  // Default target must reference 127.0.0.1 not ::1 to match backend binding
  assert.ok(
    src.includes('127.0.0.1') || src.includes('VITE_BACKEND_TARGET'),
    'proxy target must use 127.0.0.1 (IPv4) or be driven by VITE_BACKEND_TARGET env var'
  );
  assert.ok(!src.includes('::1'), 'proxy target must not hard-code IPv6 ::1 loopback');
});

test('backend server.js listens on 0.0.0.0 with PORT from env (default 5000)', () => {
  const serverPath = path.join(ROOT, 'backend', 'src', 'server.js');
  assert.ok(fs.existsSync(serverPath), 'backend/src/server.js must exist');
  const src = fs.readFileSync(serverPath, 'utf8');
  assert.ok(
    src.includes('0.0.0.0'),
    'backend must bind to 0.0.0.0 to accept connections on all interfaces'
  );
  assert.ok(
    src.includes('env.port') || src.includes('process.env.PORT'),
    'backend port must come from env, not hard-coded'
  );
});

test('backend env.js defaults port to 5000 when PORT is unset', () => {
  const envPath = path.join(ROOT, 'backend', 'src', 'config', 'env.js');
  const src = fs.readFileSync(envPath, 'utf8');
  assert.ok(
    src.includes('5000'),
    'backend env.js must fall back to port 5000 matching Vite proxy default target'
  );
});

// ---------------------------------------------------------------------------
// PHASE 2 — Fast Refresh Module Layout
// ---------------------------------------------------------------------------

test('authContextDef.js exists and exports AuthContext as a named export', () => {
  const defPath = path.join(ROOT, 'src', 'context', 'authContextDef.js');
  assert.ok(
    fs.existsSync(defPath),
    'src/context/authContextDef.js must exist (context-only module for Fast Refresh)'
  );
  const src = fs.readFileSync(defPath, 'utf8');
  assert.ok(
    src.includes('createContext'),
    'authContextDef.js must call createContext'
  );
  assert.ok(
    src.includes('export const AuthContext') || src.includes('export { AuthContext'),
    'authContextDef.js must export AuthContext as a named export'
  );
  assert.ok(
    !src.includes('function AuthProvider') && !src.includes('export function AuthProvider'),
    'authContextDef.js must NOT contain AuthProvider (keep component exports separate)'
  );
});

test('AuthContext.jsx does NOT export AuthContext directly (removed from component module)', () => {
  const ctxPath = path.join(ROOT, 'src', 'context', 'AuthContext.jsx');
  const src = fs.readFileSync(ctxPath, 'utf8');
  assert.ok(
    !src.includes('export const AuthContext = createContext'),
    'AuthContext.jsx must NOT have "export const AuthContext = createContext" — it must import from authContextDef.js'
  );
  assert.ok(
    src.includes('authContextDef'),
    'AuthContext.jsx must import AuthContext from authContextDef.js'
  );
  assert.ok(
    src.includes('export function AuthProvider'),
    'AuthContext.jsx must still export AuthProvider as the sole component export'
  );
});

test('AuthContext.jsx does NOT import createContext directly (no unused import)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'context', 'AuthContext.jsx'), 'utf8');
  // createContext must not be imported here now (it lives in authContextDef.js)
  assert.ok(
    !src.match(/import\s*\{[^}]*createContext[^}]*\}\s*from\s*['"]react['"]/),
    'AuthContext.jsx must not import createContext from react (moved to authContextDef.js)'
  );
});

test('useAuth.js imports AuthContext from authContextDef (not AuthContext.jsx)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'context', 'useAuth.js'), 'utf8');
  assert.ok(
    src.includes('authContextDef'),
    'useAuth.js must import AuthContext from authContextDef.js, not from AuthContext.jsx'
  );
  assert.ok(
    !src.includes("from './AuthContext'") && !src.includes('from "./AuthContext"'),
    'useAuth.js must not import from AuthContext.jsx to avoid circular dependency'
  );
});

test('App.jsx imports AuthProvider from AuthContext.jsx (public API unchanged)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8');
  assert.ok(
    src.includes("from './context/AuthContext'") || src.includes('from "./context/AuthContext"'),
    'App.jsx must still import AuthProvider from AuthContext.jsx — public API preserved'
  );
  assert.ok(
    src.includes('AuthProvider'),
    'App.jsx must still mount a single AuthProvider'
  );
  // Verify no duplicate AuthProvider
  const providerCount = (src.match(/AuthProvider/g) || []).length;
  // import line + usage line = 2 occurrences is normal
  assert.ok(
    providerCount <= 4,
    `App.jsx should not contain duplicate AuthProvider instances (found ${providerCount} occurrences)`
  );
});

test('No circular import: authContextDef.js does not import from AuthContext.jsx or useAuth.js', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'context', 'authContextDef.js'), 'utf8');
  // Only check actual import/require statements, not JSDoc comments
  const importLines = src
    .split('\n')
    .filter((line) => /^\s*(import|require)\s/.test(line))
    .join('\n');

  assert.ok(
    !importLines.includes('AuthContext') && !importLines.includes('./AuthContext'),
    'authContextDef.js must not import from AuthContext.jsx (would create circular dependency)'
  );
  assert.ok(
    !importLines.includes('useAuth'),
    'authContextDef.js must not import from useAuth.js'
  );
});

// ---------------------------------------------------------------------------
// PHASE 3 — Navbar Accessibility
// ---------------------------------------------------------------------------

test('Navbar.jsx uses hamburgerRef for explicit focus return after menu close', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes('hamburgerRef'),
    'Navbar must maintain a hamburgerRef for focus management'
  );
  assert.ok(
    src.includes('hamburgerRef.current?.focus()') || src.includes("hamburgerRef.current?.focus()"),
    'Navbar must call hamburgerRef.current?.focus() to restore focus when the menu closes'
  );
});

test('Navbar.jsx focuses first focusable element when menu opens', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes('firstFocusable') || src.includes('querySelector') ,
    'Navbar must find and focus the first focusable element when the drawer opens'
  );
  assert.ok(
    src.includes('focus()') ,
    'Navbar must call .focus() to move focus into the drawer on open'
  );
});

test('Navbar.jsx closes drawer on Escape key and returns focus to hamburger', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes("e.key === 'Escape'") || src.includes('e.key === "Escape"'),
    'Navbar must handle Escape key'
  );
  assert.ok(
    src.includes('hamburgerRef.current?.focus()'),
    'Escape key handler must return focus to hamburger button'
  );
});

test('Navbar.jsx drawer element has correct id matching aria-controls', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes('MOBILE_MENU_ID') || src.includes('mobile-nav-drawer'),
    'Drawer must have a stable ID constant (MOBILE_MENU_ID)'
  );
  assert.ok(
    src.includes('aria-controls'),
    'Hamburger button must have aria-controls pointing to the drawer ID'
  );
});

test('Navbar.jsx applies inert attribute on closed drawer to prevent focus reaching hidden content', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes('inert'),
    'Navbar drawer must use the inert attribute when closed to block descendant focus'
  );
});

test('Navbar.jsx uses aria-hidden on closed drawer (retained alongside inert for compat)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes('aria-hidden={!menuOpen}'),
    'Navbar drawer must set aria-hidden={!menuOpen} as a redundant safety net'
  );
});

test('Navbar.jsx has focus blurring effect to clear drawer focus before aria-hidden applies', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  // The key fix: check for the useEffect that handles focus escape from drawer
  assert.ok(
    src.includes('drawerRef.current.contains(document.activeElement)'),
    'Navbar must check if a drawer descendant holds focus when menuOpen becomes false'
  );
});

test('Navbar.jsx hamburger button has aria-expanded attribute', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes('aria-expanded={menuOpen}'),
    'Hamburger button must have aria-expanded={menuOpen}'
  );
});

test('Navbar.jsx mobile drawer has role="dialog" and aria-modal="true"', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(src.includes('role="dialog"'), 'Mobile drawer must have role="dialog"');
  assert.ok(src.includes('aria-modal="true"'), 'Mobile drawer must have aria-modal="true"');
  assert.ok(src.includes('aria-label='), 'Mobile drawer must have an aria-label');
});

test('useCallback import added to Navbar.jsx (used by closeMenu)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'components', 'Navbar', 'Navbar.jsx'), 'utf8');
  assert.ok(
    src.includes('useCallback'),
    'Navbar.jsx must import and use useCallback for the closeMenu handler'
  );
});
