import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Navigation Specification Verification
test('Navbar contains exactly Industries, Solutions, Careers in primary navigation in that order', () => {
  const navbarPath = path.resolve(process.cwd(), 'src/components/Navbar/Navbar.jsx');
  assert.ok(fs.existsSync(navbarPath), 'Navbar.jsx must exist');
  const content = fs.readFileSync(navbarPath, 'utf8');

  // Verify PRIMARY_NAV array definition
  const primaryNavMatch = content.match(/const PRIMARY_NAV\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(primaryNavMatch, 'PRIMARY_NAV must be defined in Navbar.jsx');

  const navItems = [...primaryNavMatch[1].matchAll(/label:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual(
    navItems,
    ['Industries', 'Solutions', 'Careers'],
    'Primary navigation must contain exactly Industries, Solutions, Careers in that exact order'
  );
});

test('Navbar features a distinct Employee Login button pointing to /employee-login', () => {
  const navbarPath = path.resolve(process.cwd(), 'src/components/Navbar/Navbar.jsx');
  const content = fs.readFileSync(navbarPath, 'utf8');

  assert.ok(
    content.includes('to="/employee-login"'),
    'Navbar must contain a direct link to /employee-login'
  );
  assert.ok(
    content.includes('navbar__employee-btn'),
    'Navbar must style Employee Login as a distinct button (.navbar__employee-btn)'
  );
  assert.ok(
    content.includes('Employee Login'),
    'Employee Login label must be visible'
  );
});

test('Navbar logo navigates to homepage /', () => {
  const navbarPath = path.resolve(process.cwd(), 'src/components/Navbar/Navbar.jsx');
  const content = fs.readFileSync(navbarPath, 'utf8');

  assert.ok(
    content.includes('<Link\n            to="/"\n            className="navbar__logo"') ||
    content.includes('to="/"') && content.includes('className="navbar__logo"'),
    'Company logo must navigate to /'
  );
});

// 2. Multi-page Route Map Verification
test('App.jsx defines all required enterprise routes including dedicated pages and auth gateways', () => {
  const appPath = path.resolve(process.cwd(), 'src/App.jsx');
  assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
  const content = fs.readFileSync(appPath, 'utf8');

  const requiredRoutes = [
    { path: '/', element: 'HomePage' },
    { path: '/industries', element: 'IndustriesPage' },
    { path: '/solutions', element: 'SolutionsPage' },
    { path: '/careers', element: 'CareersPage' },
    { path: '/employee-login', element: 'EmployeePortalSelector' },
    { path: '/employee-login/employee', element: 'EmployeeLoginPage' },
    { path: '/employee-login/admin', element: 'AdminLogin' },
    { path: '*', element: 'NotFoundPage' },
  ];

  requiredRoutes.forEach(({ path: routePath, element }) => {
    const routeRegex = new RegExp(`<Route\\s+path=["']${routePath.replace('*', '\\*')}["']\\s+element={<${element}`);
    assert.ok(
      routeRegex.test(content),
      `Route ${routePath} must be mapped to <${element} /> in App.jsx`
    );
  });
});

// 3. Employee Portal Route Validation
test('Employee Portal Selector links to both /employee-login/employee and /employee-login/admin', () => {
  const selectorPath = path.resolve(process.cwd(), 'src/pages/EmployeePortalSelector.jsx');
  assert.ok(fs.existsSync(selectorPath), 'EmployeePortalSelector.jsx must exist');
  const content = fs.readFileSync(selectorPath, 'utf8');

  assert.ok(
    content.includes('to="/employee-login/employee"'),
    'Portal selector must route to /employee-login/employee'
  );
  assert.ok(
    content.includes('to="/employee-login/admin"'),
    'Portal selector must route to /employee-login/admin'
  );
});
