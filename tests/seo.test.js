import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('index.html contains canonical URL, OpenGraph, Twitter card, and valid JSON-LD schema', () => {
  const indexPath = path.resolve(process.cwd(), 'index.html');
  assert.ok(fs.existsSync(indexPath), 'index.html must exist');
  const html = fs.readFileSync(indexPath, 'utf8');

  // Canonical tag
  assert.ok(html.includes('<link rel="canonical"'), 'Canonical tag must exist');

  // Open Graph
  assert.ok(html.includes('property="og:title"'), 'og:title must exist');
  assert.ok(html.includes('property="og:description"'), 'og:description must exist');
  assert.ok(html.includes('property="og:image"'), 'og:image must exist');

  // Twitter card
  assert.ok(html.includes('name="twitter:card"'), 'twitter:card must exist');

  // JSON-LD Schema
  assert.ok(html.includes('type="application/ld+json"'), 'JSON-LD schema must exist');
  assert.ok(html.includes('"@type": "Organization"'), 'Schema must define Organization');
  assert.ok(html.includes('"name": "Ashivam Technologies"'), 'Schema must declare Ashivam Technologies');
});

test('robots.txt disallows crawlers from indexing private employee and admin routes', () => {
  const robotsPath = path.resolve(process.cwd(), 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'robots.txt must exist');
  const content = fs.readFileSync(robotsPath, 'utf8');

  assert.ok(content.includes('Disallow: /admin'), 'robots.txt must disallow /admin');
  assert.ok(content.includes('Disallow: /employee-login'), 'robots.txt must disallow /employee-login');
  assert.ok(content.includes('Disallow: /api/'), 'robots.txt must disallow /api/');
  assert.ok(content.includes('Sitemap:'), 'robots.txt must specify sitemap URL');
});

test('sitemap.xml includes all core public multi-page routes', () => {
  const sitemapPath = path.resolve(process.cwd(), 'sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml must exist');
  const content = fs.readFileSync(sitemapPath, 'utf8');

  assert.ok(content.includes('<loc>https://ashivam-tec-h.vercel.app/</loc>'), 'Sitemap must include root');
  assert.ok(content.includes('<loc>https://ashivam-tec-h.vercel.app/industries</loc>'), 'Sitemap must include /industries');
  assert.ok(content.includes('<loc>https://ashivam-tec-h.vercel.app/solutions</loc>'), 'Sitemap must include /solutions');
  assert.ok(content.includes('<loc>https://ashivam-tec-h.vercel.app/careers</loc>'), 'Sitemap must include /careers');
});
