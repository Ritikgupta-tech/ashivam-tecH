import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Home Page Streamlined Structure
test('HomePage focuses on company overview without overloading with full tech stack and live recruitment boards', () => {
  const homePath = path.resolve(process.cwd(), 'src/pages/HomePage.jsx');
  assert.ok(fs.existsSync(homePath), 'HomePage.jsx must exist');
  const content = fs.readFileSync(homePath, 'utf8');

  // Verify essential overview components are present
  assert.ok(content.includes('<Hero />'), 'HomePage must include Hero component');
  assert.ok(content.includes('<About />'), 'HomePage must include About story component');
  assert.ok(content.includes('<Stats />'), 'HomePage must include Stats momentum component');
  assert.ok(content.includes('<Services />'), 'HomePage must include Services overview component');
  assert.ok(content.includes('<Solutions />'), 'HomePage must include Solutions domain highlights component');
  assert.ok(content.includes('<WhyAshivam />'), 'HomePage must include WhyAshivam principles component');
  assert.ok(content.includes('<CareersTeaser />'), 'HomePage must include compact CareersTeaser');
  assert.ok(content.includes('<Contact />'), 'HomePage must include Contact inquiry form');

  // Verify heavy sub-systems are NOT bloating HomePage directly
  assert.ok(!content.includes("import TechStack from '../components/TechStack/TechStack';"), 'TechStack must be relocated from Home to Solutions');
  assert.ok(!content.includes("import Projects from '../components/Projects/Projects';"), 'Projects must be relocated from Home to Solutions');
  assert.ok(!content.includes("import Careers from '../components/Careers/Careers';"), 'Full Careers job board must be relocated from Home to CareersPage');
});

// 2. Solutions Page Technical Depth
test('SolutionsPage houses full TechStack and Projects case studies alongside capabilities catalog', () => {
  const solutionsPath = path.resolve(process.cwd(), 'src/pages/SolutionsPage.jsx');
  assert.ok(fs.existsSync(solutionsPath), 'SolutionsPage.jsx must exist');
  const content = fs.readFileSync(solutionsPath, 'utf8');

  assert.ok(content.includes("import TechStack from '../components/TechStack/TechStack';"), 'SolutionsPage must import TechStack');
  assert.ok(content.includes('<TechStack />'), 'SolutionsPage must render TechStack');
  assert.ok(content.includes("import Projects from '../components/Projects/Projects';"), 'SolutionsPage must import Projects');
  assert.ok(content.includes('<Projects />'), 'SolutionsPage must render Projects');
});

// 3. Careers Page Comprehensive Recruitment Hub
test('CareersPage houses Culture and live Careers application board', () => {
  const careersPath = path.resolve(process.cwd(), 'src/pages/CareersPage.jsx');
  assert.ok(fs.existsSync(careersPath), 'CareersPage.jsx must exist');
  const content = fs.readFileSync(careersPath, 'utf8');

  assert.ok(content.includes("import Careers from '../components/Careers/Careers';"), 'CareersPage must import Careers');
  assert.ok(content.includes('<Careers />'), 'CareersPage must render Careers job board');
  assert.ok(content.includes("import Culture from '../components/Culture/Culture';"), 'CareersPage must import Culture');
  assert.ok(content.includes('<Culture />'), 'CareersPage must render Culture');
});

// 4. Industries Page Sector Coverage
test('IndustriesPage contains all 6 verified enterprise domain sectors', () => {
  const industriesPath = path.resolve(process.cwd(), 'src/pages/IndustriesPage.jsx');
  assert.ok(fs.existsSync(industriesPath), 'IndustriesPage.jsx must exist');
  const content = fs.readFileSync(industriesPath, 'utf8');

  const expectedSectors = [
    'Education & Academic Technology',
    'Enterprise & Business Operations',
    'Management & Organizational Systems',
    'Digital Platforms & Modern Commerce',
    'Smart Operations & Process Automation',
    'Mobile Engineering & Field Operations',
  ];

  expectedSectors.forEach((sector) => {
    assert.ok(content.includes(sector), `IndustriesPage must include verified sector: ${sector}`);
  });
});
