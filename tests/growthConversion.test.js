import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Hero Conversion Architecture
test('Hero component prioritizes "Discuss Your Project" primary conversion action', () => {
  const heroPath = path.resolve(process.cwd(), 'src/components/Hero/Hero.jsx');
  assert.ok(fs.existsSync(heroPath), 'Hero.jsx must exist');
  const content = fs.readFileSync(heroPath, 'utf8');

  assert.ok(
    content.includes('id="hero-cta-contact"') && content.includes('Discuss Your Project'),
    'Hero must feature primary CTA "Discuss Your Project" targeting #contact'
  );
  assert.ok(
    content.includes('id="hero-cta-solutions"') && content.includes('Explore Solutions'),
    'Hero must feature secondary CTA "Explore Solutions" targeting /solutions'
  );
});

// 2. Delivery Lifecycle Architecture
test('HomePage mounts the 4-phase agile engineering delivery lifecycle (<Process />)', () => {
  const homePath = path.resolve(process.cwd(), 'src/pages/HomePage.jsx');
  const homeContent = fs.readFileSync(homePath, 'utf8');
  assert.ok(homeContent.includes('<Process />'), 'HomePage must render <Process /> component');

  const processPath = path.resolve(process.cwd(), 'src/components/Process/Process.jsx');
  assert.ok(fs.existsSync(processPath), 'Process.jsx must exist');
  const processContent = fs.readFileSync(processPath, 'utf8');

  assert.ok(processContent.includes('01') && processContent.includes('Architecture & Discovery'), 'Step 1 must be Architecture & Discovery');
  assert.ok(processContent.includes('02') && processContent.includes('Agile Engineering'), 'Step 2 must be Agile Engineering');
  assert.ok(processContent.includes('03') && processContent.includes('Quality & Security'), 'Step 3 must be Quality & Security');
  assert.ok(processContent.includes('04') && processContent.includes('Deployment & SLA'), 'Step 4 must be Deployment & SLA');
  assert.ok(processContent.includes('Initiate Your Architecture Review'), 'Process must include project review CTA');
});

// 3. Contact Form Conversion & Prompt Response Microcopy
test('Contact component includes phone capture and prompt response assurance', () => {
  const contactPath = path.resolve(process.cwd(), 'src/components/Contact/Contact.jsx');
  assert.ok(fs.existsSync(contactPath), 'Contact.jsx must exist');
  const content = fs.readFileSync(contactPath, 'utf8');

  assert.ok(content.includes('id="contact-phone"'), 'Contact form must provide phone / WhatsApp field');
  assert.ok(content.includes('Phone / WhatsApp (Optional)'), 'Contact form must label phone clearly as optional');
  assert.ok(content.includes('contact__privacy-assurance'), 'Contact form must include response assurance block');
  assert.ok(content.includes('Our team reviews all inquiries promptly.'), 'Contact form must use approved prompt response phrasing');
});

// 4. Client-side SEO Metadata Management
test('SEO utility defines updatePageMeta for dynamic single-page route metadata', () => {
  const seoPath = path.resolve(process.cwd(), 'src/utils/seo.js');
  assert.ok(fs.existsSync(seoPath), 'seo.js must exist');
  const content = fs.readFileSync(seoPath, 'utf8');

  assert.ok(content.includes('export function updatePageMeta'), 'seo.js must export updatePageMeta');
  assert.ok(content.includes('document.title = title'), 'updatePageMeta must update document.title');
  assert.ok(content.includes('metaDesc.setAttribute(\'content\', description)'), 'updatePageMeta must update meta description');
});

// 5. Rich Schema.org Structured Data
test('index.html contains enriched JSON-LD with WebSite and Service OfferCatalog', () => {
  const indexPath = path.resolve(process.cwd(), 'index.html');
  const content = fs.readFileSync(indexPath, 'utf8');

  assert.ok(content.includes('"@type": "Organization"'), 'Must define Organization');
  assert.ok(content.includes('"@type": "WebSite"'), 'Must define WebSite in schema graph');
  assert.ok(content.includes('"@type": "OfferCatalog"'), 'Must define OfferCatalog for services');
  assert.ok(content.includes('Web Application Development'), 'Catalog must include Web Application Development');
  assert.ok(content.includes('Custom Enterprise Software'), 'Catalog must include Custom Enterprise Software');
});

// 6. GA4 Analytics Script Loader & Tag Verification
test('analytics.js defines initAnalytics and dispatches events via window.gtag', () => {
  const analyticsPath = path.resolve(process.cwd(), 'src/utils/analytics.js');
  assert.ok(fs.existsSync(analyticsPath), 'analytics.js must exist');
  const content = fs.readFileSync(analyticsPath, 'utf8');

  assert.ok(content.includes('export function initAnalytics'), 'analytics.js must export initAnalytics');
  assert.ok(content.includes('googletagmanager.com/gtag/js'), 'analytics.js must construct Google Tag Manager script URL');
  assert.ok(content.includes('window.dataLayer'), 'analytics.js must initialize dataLayer queue');
  assert.ok(content.includes("window.gtag('event', eventName, payload)"), 'analytics.js must dispatch events to gtag');
  assert.ok(content.includes('export function trackInquirySubmit'), 'analytics.js must export trackInquirySubmit');
});

// 7. Static Assets for Crawlers in Public Directory
test('public/ contains robots.txt and sitemap.xml for Vite production distribution', () => {
  const publicRobots = path.resolve(process.cwd(), 'public/robots.txt');
  const publicSitemap = path.resolve(process.cwd(), 'public/sitemap.xml');

  assert.ok(fs.existsSync(publicRobots), 'public/robots.txt must exist for Vite build copy');
  assert.ok(fs.existsSync(publicSitemap), 'public/sitemap.xml must exist for Vite build copy');

  const robots = fs.readFileSync(publicRobots, 'utf8');
  assert.ok(robots.includes('Sitemap: https://ashivam-tec-h.vercel.app/sitemap.xml'), 'public/robots.txt must specify production sitemap URL');
});

// 8. Content Credibility & Claim Integrity
test('Process and Solutions components maintain credible claims without unsupported guarantees', () => {
  const processContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Process/Process.jsx'), 'utf8');
  assert.ok(!processContent.includes('100%'), 'Process must not claim 100% test pass guarantee');
  assert.ok(!processContent.includes('Zero-Vulnerability'), 'Process must not claim zero-vulnerability guarantees');
  assert.ok(!processContent.includes('Zero-downtime deployment'), 'Process must not promise zero-downtime deployment SLAs without verification');
  assert.ok(processContent.includes('Automated Test Suites & Regression Checks'), 'Process must specify realistic regression testing deliverables');
  assert.ok(processContent.includes('Security Hardening & Dependency Audits'), 'Process must specify realistic security auditing deliverables');

  const solutionsContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/SolutionsPage.jsx'), 'utf8');
  assert.ok(!solutionsContent.includes('Impenetrable RESTful APIs'), 'Solutions must not claim impenetrable APIs');
  assert.ok(solutionsContent.includes('Hardened RESTful APIs'), 'Solutions must use realistic hardened API phrasing');
});

// 9. Single-Header Content Hierarchy Architecture
test('Industries and Solutions pages maintain streamlined single-header hierarchy without double-stacked introductions', () => {
  const industriesContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/IndustriesPage.jsx'), 'utf8');
  assert.ok(!industriesContent.includes('section-header'), 'IndustriesPage must not render redundant duplicate section-header block');
  assert.ok(industriesContent.includes('industries-filter'), 'IndustriesPage must integrate filter pills directly under hero value proposition');

  const solutionsContent = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/SolutionsPage.jsx'), 'utf8');
  assert.ok(!solutionsContent.includes('section-header'), 'SolutionsPage must not render redundant duplicate section-header block');
  assert.ok(solutionsContent.includes('solutions-filter'), 'SolutionsPage must integrate filter pills directly under hero value proposition');
});

// 10. Filter Touch Ergonomics
test('Filter controls on multi-page domains enforce minimum 44px touch targets', () => {
  const industriesCss = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/IndustriesPage.css'), 'utf8');
  assert.ok(industriesCss.includes('.industries-filter__btn') && industriesCss.includes('min-height: 44px;'), 'Industries filter buttons must have 44px touch target');

  const solutionsCss = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/SolutionsPage.css'), 'utf8');
  assert.ok(solutionsCss.includes('.solutions-filter__btn') && solutionsCss.includes('min-height: 44px;'), 'Solutions filter buttons must have 44px touch target');
});
