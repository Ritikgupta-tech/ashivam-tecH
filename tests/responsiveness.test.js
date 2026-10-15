import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Viewport Configuration Check
test('index.html contains valid responsive viewport meta tag', () => {
  const indexPath = path.resolve(process.cwd(), 'index.html');
  const html = fs.readFileSync(indexPath, 'utf8');
  assert.match(
    html,
    /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*initial-scale=1\.0[^"']*["']/i,
    'index.html must contain standard width=device-width, initial-scale=1.0 viewport configuration'
  );
});

// 2. Touch Target Compliance (>= 44x44px for primary interactive elements)
test('Primary interactive targets satisfy the 44px minimum touch target size', () => {
  const globalsPath = path.resolve(process.cwd(), 'src/styles/globals.css');
  const globalsCss = fs.readFileSync(globalsPath, 'utf8');
  assert.ok(globalsCss.includes('min-height: 44px;'), '.btn class in globals.css must specify min-height: 44px');

  const navbarPath = path.resolve(process.cwd(), 'src/components/Navbar/Navbar.css');
  const navbarCss = fs.readFileSync(navbarPath, 'utf8');
  assert.ok(navbarCss.includes('width: 44px;') && navbarCss.includes('height: 44px;'), 'Navbar hamburger must be at least 44x44px');
  assert.ok(navbarCss.includes('.mobile-menu__close-btn') && navbarCss.includes('width: 44px;'), 'Mobile menu close button must be at least 44x44px');
  assert.ok(navbarCss.includes('.mobile-menu__link') && navbarCss.includes('min-height: 48px;'), 'Mobile menu links must have at least 48px tap target');

  const careersPath = path.resolve(process.cwd(), 'src/components/Careers/Careers.css');
  const careersCss = fs.readFileSync(careersPath, 'utf8');
  assert.ok(careersCss.includes('.career-modal__close') && careersCss.includes('min-height: 44px;'), 'Career modal close button must satisfy 44px touch target');
});

// 3. Responsive Navigation Architecture
test('Navbar component implements comprehensive mobile drawer accessibility and controls', () => {
  const navbarJsxPath = path.resolve(process.cwd(), 'src/components/Navbar/Navbar.jsx');
  const navbarJsx = fs.readFileSync(navbarJsxPath, 'utf8');

  // ARIA attributes
  assert.ok(navbarJsx.includes('aria-expanded={menuOpen}'), 'Hamburger button must have aria-expanded');
  assert.ok(navbarJsx.includes('aria-label='), 'Navigation elements must have descriptive aria-labels');
  assert.ok(navbarJsx.includes('role="dialog"'), 'Mobile drawer must declare role="dialog"');
  assert.ok(navbarJsx.includes('aria-modal="true"'), 'Mobile drawer must declare aria-modal="true"');

  // Escape key & Body scroll lock
  assert.ok(navbarJsx.includes("e.key === 'Escape'"), 'Navbar must support Escape key to close mobile drawer');
  assert.ok(navbarJsx.includes("document.body.style.overflow = 'hidden'"), 'Navbar must lock body scroll when drawer is open');

  // Drawer ref & outside click protection
  assert.ok(navbarJsx.includes('drawerRef'), 'Navbar must track drawerRef to prevent self-closing clicks inside drawer');
  assert.ok(navbarJsx.includes('ref={drawerRef}'), 'mobile-menu container must attach drawerRef');
});

// 4. Fluid Typography & Clamp Sizing
test('Headings and typography use fluid clamp scales without clipping', () => {
  const globalsPath = path.resolve(process.cwd(), 'src/styles/globals.css');
  const globalsCss = fs.readFileSync(globalsPath, 'utf8');

  assert.ok(globalsCss.includes('h1 { font-size: clamp('), 'h1 must use fluid clamp typography');
  assert.ok(globalsCss.includes('h2 { font-size: clamp('), 'h2 must use fluid clamp typography');
  assert.ok(globalsCss.includes('overflow-wrap: break-word;'), 'Headings must prevent text clipping with overflow-wrap');
});

// 5. Responsive Grids & Mobile Breakpoints
test('Multi-column sections stack to single column on mobile viewports', () => {
  // Services
  const servicesCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Services/Services.css'), 'utf8');
  assert.ok(servicesCss.includes('@media (max-width: 640px)') && servicesCss.includes('grid-template-columns: 1fr;'), 'Services grid must collapse to 1fr on mobile');

  // Solutions
  const solutionsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Solutions/Solutions.css'), 'utf8');
  assert.ok(solutionsCss.includes('@media (max-width: 640px)') && solutionsCss.includes('grid-template-columns: 1fr;'), 'Solutions grid must collapse to 1fr on mobile');

  // Stats
  const statsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Stats/Stats.css'), 'utf8');
  assert.ok(statsCss.includes('@media (max-width: 480px)') && statsCss.includes('grid-template-columns: 1fr;'), 'Stats grid must collapse to 1fr on small mobile');

  // Industries Page
  const industriesCss = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/IndustriesPage.css'), 'utf8');
  assert.ok(industriesCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'), 'Industries grid must use balanced 3-column layout on desktop');
  assert.ok(industriesCss.includes('@media (max-width: 1024px)') && industriesCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'), 'Industries grid must collapse to 2 columns on tablet');
  assert.ok(industriesCss.includes('@media (max-width: 640px)') && industriesCss.includes('grid-template-columns: 1fr;'), 'Industries grid must collapse to 1fr on mobile');
  assert.ok(industriesCss.includes('.industries-filter__btn'), 'Industries filter buttons must have responsive styling');

  // Solutions Page
  const solutionsPageCss = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/SolutionsPage.css'), 'utf8');
  assert.ok(solutionsPageCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr));'), 'SolutionsPage grid must use balanced 3-column layout on desktop');
  assert.ok(solutionsPageCss.includes('@media (max-width: 1024px)') && solutionsPageCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'), 'SolutionsPage grid must collapse to 2 columns on tablet');
  assert.ok(solutionsPageCss.includes('@media (max-width: 640px)') && solutionsPageCss.includes('grid-template-columns: 1fr;'), 'SolutionsPage grid must collapse to 1fr on mobile');

  // Process / Delivery Workflow
  const processCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Process/Process.css'), 'utf8');
  assert.ok(processCss.includes('grid-template-columns: repeat(4, 1fr);'), 'Process grid must display 4 columns on wide desktop');
  assert.ok(processCss.includes('@media (max-width: 1024px)') && processCss.includes('grid-template-columns: repeat(2, 1fr);'), 'Process grid must collapse to 2 columns on tablet');
  assert.ok(processCss.includes('@media (max-width: 640px)') && processCss.includes('grid-template-columns: 1fr;'), 'Process grid must collapse to 1fr on mobile');
});

// 6. Mobile Forms & Modals Layout
test('Form rows and modals stack vertically without horizontal overflow', () => {
  // Contact Form
  const contactCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Contact/Contact.css'), 'utf8');
  assert.ok(contactCss.includes('@media (max-width: 640px)') && contactCss.includes('grid-template-columns: 1fr;'), 'Contact form-row must stack to 1 column on mobile');

  // Careers Modal Form
  const careersCss = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Careers/Careers.css'), 'utf8');
  assert.ok(careersCss.includes('@media (max-width: 540px)') && careersCss.includes('.career-form-row'), 'Careers form-row must stack to 1 column on mobile');
  assert.ok(careersCss.includes('.career-modal-overlay'), 'Careers modal overlay must scale down padding on small screens');

  // Employee Login
  const loginCss = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/EmployeeLoginPage.css'), 'utf8');
  assert.ok(loginCss.includes('@media (max-width: 360px)'), 'Employee Login must include <=360px small screen optimizations');
});

// 7. Responsive Images and Asset Safeguards
test('Images and media adhere to fluid constraints', () => {
  const globalsPath = path.resolve(process.cwd(), 'src/styles/globals.css');
  const globalsCss = fs.readFileSync(globalsPath, 'utf8');

  assert.ok(globalsCss.includes('max-width: 100%;') && globalsCss.includes('height: auto;'), 'Global img selector must constrain max-width: 100% and height: auto');
  assert.ok(globalsCss.includes('overflow-x: clip;'), 'html must enforce overflow-x: clip to prevent horizontal scroll bleed');
});
