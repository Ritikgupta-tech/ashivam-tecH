import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import {
  CodeIcon,
  ServerIcon,
  ShieldIcon,
  LightbulbIcon,
  GearIcon,
  RocketIcon,
  ArrowRightIcon,
  CheckIcon,
} from '../components/icons';
import TechStack from '../components/TechStack/TechStack';
import Projects from '../components/Projects/Projects';
import './SolutionsPage.css';

const SOLUTIONS_DATA = [
  {
    id: 'web-platforms',
    category: 'web',
    categoryLabel: 'Web & Digital Platforms',
    icon: CodeIcon,
    title: 'Modern Web Application Engineering',
    tagline: 'High-performance, accessible, and scalable digital interfaces.',
    description:
      'We architect and build enterprise-grade web applications using modern component-driven methodologies. Our focus is responsive performance, fluid state management, and robust security headers.',
    capabilities: [
      'Single-page applications (SPA) & static rendering',
      'Complex dashboard & data visualization interfaces',
      'State synchronization, caching, and offline recovery',
      'Strict WCAG 2.1 accessibility and SEO optimization',
    ],
    technologies: ['React', 'JavaScript / TypeScript', 'HTML5 / Modern CSS', 'RESTful APIs'],
  },
  {
    id: 'custom-software',
    category: 'software',
    categoryLabel: 'Custom Software',
    icon: GearIcon,
    title: 'Custom Enterprise Software Development',
    tagline: 'Clean architectures engineered around your exact business logic.',
    description:
      'Off-the-shelf software often forces organizations into awkward trade-offs. We design bespoke systems that adapt to your operational workflows, scale under high concurrency, and evolve without technical debt.',
    capabilities: [
      'Bespoke ERP, CRM, and management system design',
      'Legacy software modernization and modular migration',
      'Integration bridges between disparate enterprise tools',
      'Automated regression testing and clean code reviews',
    ],
    technologies: ['Java', 'Spring Boot', 'Python', 'Node.js', 'MySQL'],
  },
  {
    id: 'mobile-engineering',
    category: 'mobile',
    categoryLabel: 'Mobile Engineering',
    icon: RocketIcon,
    title: 'Mobile Architecture & App Development',
    tagline: 'Native Android and adaptive mobile apps built for speed.',
    description:
      'We craft high-quality mobile applications with zero-lag user interactions, intuitive touch ergonomics, and resilient background synchronization for field and consumer applications.',
    capabilities: [
      'Native Android app engineering in Kotlin',
      'Offline-first data sync and encrypted local storage',
      'Hardware integration (camera, GPS, biometrics)',
      'Push notification pipelines and event listeners',
    ],
    technologies: ['Android SDK', 'Kotlin', 'Firebase', 'SQLite'],
  },
  {
    id: 'backend-cloud',
    category: 'backend',
    categoryLabel: 'Backend & Cloud',
    icon: ServerIcon,
    title: 'Backend Systems & API Architecture',
    tagline: 'Impenetrable RESTful APIs and distributed server architectures.',
    description:
      'Behind every fast application is a rock-solid server foundation. We build scalable backend services with strict validation, rate limiting, token security, and structured observability.',
    capabilities: [
      'REST API design with strict request validation',
      'JWT token sessions and role-based access control (RBAC)',
      'Multi-tier rate limiting and DDoS protection',
      'Structured request correlation and error normalization',
    ],
    technologies: ['Node.js', 'Express', 'Spring Boot', 'MongoDB / Mongoose', 'PostgreSQL'],
  },
  {
    id: 'uiux-architecture',
    category: 'design',
    categoryLabel: 'Design & Ergonomics',
    icon: LightbulbIcon,
    title: 'UI/UX Architecture & Product Design',
    tagline: 'Balancing conversion aesthetics with functional ergonomics.',
    description:
      'Enterprise software does not have to be frustrating to use. We design clean, intentional, design-token-driven interfaces that accelerate user adoption and minimize operational training.',
    capabilities: [
      'Design systems, typography scales, and token systems',
      'Interactive prototyping and user journey validation',
      'Usability audits and responsive viewport testing',
      'Figma component libraries and developer handoffs',
    ],
    technologies: ['Figma', 'Design Tokens', 'User Journey Mapping', 'Micro-Interactions'],
  },
  {
    id: 'data-persistence',
    category: 'backend',
    categoryLabel: 'Data & Persistence',
    icon: ShieldIcon,
    title: 'Data Architecture & Storage Security',
    tagline: 'Reliable document and relational persistence models.',
    description:
      'We structure database schemas with explicit validation, indexing strategies for sub-millisecond query execution, and strict server-side encryption for sensitive enterprise records.',
    capabilities: [
      'MongoDB document modeling with Mongoose validation',
      'Relational normalization and ACID consistency (MySQL)',
      'Private document storage with signed authorization vaults',
      'Automated database backup and migration strategies',
    ],
    technologies: ['MongoDB', 'Mongoose', 'MySQL', 'AWS S3 / Local Storage'],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Capabilities' },
  { id: 'web', label: 'Web & Digital' },
  { id: 'software', label: 'Custom Software' },
  { id: 'mobile', label: 'Mobile Apps' },
  { id: 'backend', label: 'Backend & Cloud' },
  { id: 'design', label: 'UI/UX Design' },
];

export default function SolutionsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Technology Solutions & Engineering | Ashivam Technologies';
  }, []);

  const filteredSolutions =
    selectedCategory === 'all'
      ? SOLUTIONS_DATA
      : SOLUTIONS_DATA.filter((s) => s.category === selectedCategory);

  return (
    <div className="solutions-page">
      <Navbar />

      <main className="solutions-main" id="main-content">
        {/* Hero Section */}
        <section className="solutions-hero section">
          <div className="container">
            <div className="solutions-hero__content">
              <div className="solutions-hero__badge">
                <span>Enterprise Technology Solutions</span>
              </div>
              <h1 className="solutions-hero__title">
                Software Capabilities Engineered with{' '}
                <span className="gradient-text-gold">Precision</span>
              </h1>
              <p className="solutions-hero__desc">
                From scalable web architectures and native mobile apps to resilient cloud backends, we build technology foundations that turn complex challenges into competitive operating advantages.
              </p>
              <div className="solutions-hero__actions">
                <a href="#solutions-catalog" className="btn btn-primary">
                  <span>View Solutions</span>
                  <ArrowRightIcon size={16} />
                </a>
                <Link to="/contact" className="btn btn-secondary">
                  <span>Discuss Your Project</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog & Filter Section */}
        <section className="solutions-catalog section" id="solutions-catalog">
          <div className="container">
            <div className="section-header text-center">
              <p className="section-label">Engineering Portfolio</p>
              <h2>
                Architectural Depth Across the <span className="gradient-text-gold">Full Stack</span>
              </h2>
              <p className="section-subtitle">
                Explore our core technology capabilities and see how our disciplined approach delivers reliable results.
              </p>

              {/* Category Filter Pills */}
              <div className="solutions-filter" role="tablist" aria-label="Filter solutions by discipline">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    role="tab"
                    aria-selected={selectedCategory === cat.id}
                    className={`solutions-filter__btn${
                      selectedCategory === cat.id ? ' solutions-filter__btn--active' : ''
                    }`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Solutions Grid */}
            <div className="solutions-grid">
              {filteredSolutions.map((sol) => {
                const IconComponent = sol.icon;
                return (
                  <article key={sol.id} className="solution-card" id={sol.id}>
                    <div className="solution-card__header">
                      <div className="solution-card__icon-wrap" aria-hidden="true">
                        <IconComponent size={24} />
                      </div>
                      <span className="solution-card__badge">{sol.categoryLabel}</span>
                    </div>

                    <h3 className="solution-card__title">{sol.title}</h3>
                    <p className="solution-card__tagline">{sol.tagline}</p>
                    <p className="solution-card__desc">{sol.description}</p>

                    <div className="solution-card__capabilities">
                      <h4 className="solution-card__caps-title">Core Deliverables</h4>
                      <ul className="solution-card__caps-list">
                        {sol.capabilities.map((cap, i) => (
                          <li key={i} className="solution-card__cap-item">
                            <CheckIcon size={14} className="solution-card__cap-icon" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="solution-card__footer">
                      <div className="solution-card__techs">
                        {sol.technologies.map((tech) => (
                          <span key={tech} className="solution-card__tech-tag">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <Link to="/contact" className="solution-card__link">
                        <span>Consult on this solution</span>
                        <ArrowRightIcon size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Full Interactive Technology Ecosystem */}
        <TechStack />

        {/* Engineered Products, Case Studies & Deliverables */}
        <Projects />

        {/* Engineering Philosophy Banner */}
        <section className="solutions-banner section">
          <div className="container">
            <div className="solutions-banner__card">
              <div className="solutions-banner__text">
                <h2>Looking for an enterprise partner?</h2>
                <p>
                  We don't just deliver lines of code. We advise on technical architecture, design for resilience, and deliver maintainable software that stands the test of time.
                </p>
              </div>
              <div className="solutions-banner__actions">
                <Link to="/contact" className="btn btn-primary">
                  <span>Start an Architectural Review</span>
                  <ArrowRightIcon size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
