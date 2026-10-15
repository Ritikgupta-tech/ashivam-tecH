import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { useScrollReveal } from '../hooks/useScrollReveal';
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
import { updatePageMeta } from '../utils/seo';
import './SolutionsPage.css';

const SOLUTIONS_DATA = [
  {
    id: 'web-platforms',
    category: 'web',
    categoryLabel: 'Web & Digital',
    icon: CodeIcon,
    title: 'Modern Web Application Engineering',
    summary: 'High-performance digital interfaces engineered with React, fluid state synchronization, and strict WCAG accessibility.',
    capabilities: [
      'Single-page applications (SPA) & modern frameworks',
      'Complex dashboards & data visualizations',
      'Sub-second load times & SEO optimization',
    ],
    technologies: ['React', 'TypeScript', 'REST APIs', 'Vite'],
  },
  {
    id: 'custom-software',
    category: 'software',
    categoryLabel: 'Custom Software',
    icon: GearIcon,
    title: 'Custom Enterprise Software Development',
    summary: 'Bespoke operational systems designed around your proprietary business logic without legacy technical debt.',
    capabilities: [
      'Custom ERP, CRM, and workflow tools',
      'Legacy migration & service decoupling',
      'Integration bridges between internal systems',
    ],
    technologies: ['Java', 'Spring Boot', 'Node.js', 'PostgreSQL'],
  },
  {
    id: 'mobile-engineering',
    category: 'mobile',
    categoryLabel: 'Mobile Engineering',
    icon: RocketIcon,
    title: 'Mobile Architecture & App Development',
    summary: 'Native Android and mobile experiences with zero-lag interactions, offline caching, and biometric authentication.',
    capabilities: [
      'Native Android engineering in Kotlin',
      'Offline-first synchronization & SQLite',
      'Hardware telemetry & push pipelines',
    ],
    technologies: ['Android SDK', 'Kotlin', 'SQLite', 'Firebase'],
  },
  {
    id: 'backend-cloud',
    category: 'backend',
    categoryLabel: 'Backend & Cloud',
    icon: ServerIcon,
    title: 'Backend Systems & API Architecture',
    summary: 'Hardened RESTful APIs and distributed server architectures with token authentication and rate limiting.',
    capabilities: [
      'Hardened RESTful APIs with input validation',
      'JWT token sessions & role-based RBAC',
      'Multi-tier rate limiting & request logging',
    ],
    technologies: ['Node.js', 'Express', 'MongoDB', 'Docker'],
  },
  {
    id: 'uiux-architecture',
    category: 'design',
    categoryLabel: 'Design & Ergonomics',
    icon: LightbulbIcon,
    title: 'UI/UX Architecture & Product Design',
    summary: 'Design-token-driven interfaces and user flows that maximize conversion and reduce operational onboarding.',
    capabilities: [
      'Design systems & fluid typography tokens',
      'User journey mapping & prototyping',
      'Usability audits across all viewports',
    ],
    technologies: ['Figma', 'Design Tokens', 'User Journeys', 'Wireframing'],
  },
  {
    id: 'data-persistence',
    category: 'backend',
    categoryLabel: 'Data & Persistence',
    icon: ShieldIcon,
    title: 'Data Architecture & Storage Security',
    summary: 'Document and relational schemas optimized for sub-millisecond execution and private data custody.',
    capabilities: [
      'MongoDB document modeling & indexing',
      'Relational normalization & consistency',
      'Private authorization vaults & backups',
    ],
    technologies: ['MongoDB', 'Mongoose', 'MySQL', 'Storage Vaults'],
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
  useScrollReveal();
  const { category } = useParams();
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');

  useEffect(() => {
    window.scrollTo(0, 0);
    updatePageMeta({
      title: 'Technology Solutions & Engineering | Ashivam Technologies',
      description: 'Comprehensive software engineering solutions: modern web application architecture, custom enterprise ERP, Android mobile development, and cloud backend engineering.',
      canonical: 'https://ashivam-tec-h.vercel.app/solutions',
    });
  }, []);

  useEffect(() => {
    if (category && CATEGORIES.some((c) => c.id === category)) {
      setSelectedCategory(category);
    }
  }, [category]);

  const filteredSolutions =
    selectedCategory === 'all'
      ? SOLUTIONS_DATA
      : SOLUTIONS_DATA.filter((s) => s.category === selectedCategory);

  return (
    <div className="solutions-page">
      <Navbar />

      <main className="solutions-main" id="main-content">
        <section className="solutions-section">
          <div className="container">
            {/* Compact Header & Integrated Filter */}
            <header className="solutions-header">
              <span className="solutions-eyebrow">Enterprise Technology Solutions</span>
              <h1 className="solutions-title">
                Software Solutions Built for{' '}
                <span className="gradient-text-gold">Real Business Needs</span>
              </h1>
              <p className="solutions-subtitle">
                From scalable web interfaces and native mobile apps to hardened backend infrastructure, we build technology foundations that turn complex challenges into operational advantages.
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
            </header>

            {/* Compact SaaS Service Cards Grid */}
            <div className="solutions-grid" id="solutions-catalog">
              {filteredSolutions.map((sol) => {
                const IconComponent = sol.icon;
                return (
                  <article key={sol.id} className="solution-card" id={sol.id}>
                    <div className="solution-card__header">
                      <div className="solution-card__icon-wrap" aria-hidden="true">
                        <IconComponent size={20} />
                      </div>
                      <span className="solution-card__badge">{sol.categoryLabel}</span>
                    </div>

                    <h2 className="solution-card__title">{sol.title}</h2>
                    <p className="solution-card__summary">{sol.summary}</p>

                    <ul className="solution-card__capabilities">
                      {sol.capabilities.map((cap, i) => (
                        <li key={i} className="solution-card__cap-item">
                          <CheckIcon size={13} className="solution-card__cap-icon" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="solution-card__footer">
                      <div className="solution-card__techs">
                        {sol.technologies.map((tech) => (
                          <span key={tech} className="solution-card__tech-tag">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <Link to="/contact" className="solution-card__link">
                        <span>Explore Solution</span>
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

        {/* Compact Engineering Partner Banner */}
        <section className="solutions-banner">
          <div className="container">
            <div className="solutions-banner__card">
              <div className="solutions-banner__text">
                <h3>Looking for an enterprise engineering partner?</h3>
                <p>
                  We advise on technical architecture, design for resilience, and deliver maintainable software that stands the test of time.
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
