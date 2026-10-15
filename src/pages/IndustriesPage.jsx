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
import { updatePageMeta } from '../utils/seo';
import './IndustriesPage.css';

const SECTOR_TABS = [
  { id: 'all', label: 'All Sectors' },
  { id: 'edtech', label: 'Education' },
  { id: 'enterprise-erp', label: 'Enterprise ERP' },
  { id: 'management', label: 'Management' },
  { id: 'digital-platforms', label: 'Digital Platforms' },
  { id: 'automation', label: 'Automation' },
  { id: 'mobile-ecosystem', label: 'Mobile' },
];

const INDUSTRIES_DATA = [
  {
    id: 'edtech',
    icon: LightbulbIcon,
    name: 'Education & Academic Technology',
    tagline: 'Bridging institutions, educators, and learners with modern software.',
    description:
      'We engineer comprehensive digital platforms for universities, academies, and training providers. From automated attendance engines to interactive student portals, our solutions eliminate administrative friction.',
    capabilities: [
      'Digital student portals and academic hubs',
      'Automated attendance and reporting systems',
      'Secure exam workflows and grade management',
      'Real-time communication and notification channels',
    ],
    highlight: 'Engineered for high-concurrency access and offline resilience.',
  },
  {
    id: 'enterprise-erp',
    icon: ServerIcon,
    name: 'Enterprise & Business Operations',
    tagline: 'Streamlining mission-critical business workflows with tailored ERP.',
    description:
      'Off-the-shelf software often burdens growing businesses with unnecessary complexity. We build lightweight, maintainable ERP platforms that unify inventory, invoicing, team allocation, and reporting.',
    capabilities: [
      'Custom ERP and inventory lifecycle platforms',
      'Automated billing, invoicing, and ledger pipelines',
      'Role-governed task assignment and tracking',
      'Executive dashboard metrics and financial overviews',
    ],
    highlight: 'Clean relational architecture with automated audit compliance.',
  },
  {
    id: 'management',
    icon: ShieldIcon,
    name: 'Management & Organizational Systems',
    tagline: 'Secure employee lifecycle management and enterprise document vaults.',
    description:
      'Modern institutions require secure data custody, auditable policy distribution, and frictionless onboarding. Our organizational architectures guarantee end-to-end security and role-based permissions.',
    capabilities: [
      'Comprehensive employee lifecycle & profile systems',
      'Private employee document verification vaults',
      'HR policy publishing and digital acknowledgments',
      'Role-based access control (RBAC) and audit trails',
    ],
    highlight: 'Strict least-privilege security with server-side authorization.',
  },
  {
    id: 'digital-platforms',
    icon: CodeIcon,
    name: 'Digital Platforms & Modern Commerce',
    tagline: 'High-performance user interfaces and responsive web applications.',
    description:
      'We help consumer-facing enterprises and growing digital brands launch lightning-fast web applications. Combining React, responsive state management, and optimized asset delivery to maximize conversion.',
    capabilities: [
      'High-speed, SEO-engineered web applications',
      'Cross-platform responsive design for all screen sizes',
      'Secure payment gateway and transactional integrations',
      'Real-time state synchronization with sub-second feedback',
    ],
    highlight: 'Optimized for sub-second page loads and mobile-first users.',
  },
  {
    id: 'automation',
    icon: GearIcon,
    name: 'Smart Operations & Process Automation',
    tagline: 'Eliminating repetitive manual workflows with reliable automated logic.',
    description:
      'Speed and accuracy define competitive advantage. We engineer background workers, webhook pipelines, and automated reporting systems that connect disparate tools into an orchestrated ecosystem.',
    capabilities: [
      'Scheduled background jobs and batch processing',
      'Automated email notifications and event triggers',
      'API prototyping, integration, and gateway bridges',
      'Telemetry logging, error alerting, and health probes',
    ],
    highlight: 'Resilient event-driven architecture with structured error handling.',
  },
  {
    id: 'mobile-ecosystem',
    icon: RocketIcon,
    name: 'Mobile Engineering & Field Operations',
    tagline: 'Native Android and hybrid applications built for field agility.',
    description:
      'Empower on-the-ground teams, field technicians, and consumers with responsive mobile applications engineered with native speed, offline caching, and intuitive user ergonomics.',
    capabilities: [
      'Native Android applications engineered in Kotlin',
      'Local-first SQLite / encrypted cache persistence',
      'Background geolocation and sync capabilities',
      'Biometric authentication and secure local storage',
    ],
    highlight: 'Engineered for smooth 60fps frame rates and minimal battery drain.',
  },
];

export default function IndustriesPage() {
  useScrollReveal();
  const { sector } = useParams();
  const [selectedSector, setSelectedSector] = useState(sector || 'all');

  useEffect(() => {
    window.scrollTo(0, 0);
    updatePageMeta({
      title: 'Industries We Serve | Ashivam Technologies',
      description: 'Domain software solutions engineered for Education, Enterprise ERP, Organizational Systems, Digital Platforms, Operations Automation, and Mobile Field Operations.',
      canonical: 'https://ashivam-tec-h.vercel.app/industries',
    });
  }, []);

  useEffect(() => {
    if (sector && SECTOR_TABS.some((t) => t.id === sector)) {
      setSelectedSector(sector);
    }
  }, [sector]);

  const filteredIndustries =
    selectedSector === 'all'
      ? INDUSTRIES_DATA
      : INDUSTRIES_DATA.filter((ind) => ind.id === selectedSector);

  return (
    <div className="industries-page">
      <Navbar />

      <main className="industries-main" id="main-content">
        {/* Unified Hero & Sector Filter */}
        <section className="industries-hero section">
          <div className="container">
            <div className="industries-hero__content">
              <div className="industries-hero__badge">
                <span>Enterprise Domain Architecture</span>
              </div>
              <h1 className="industries-hero__title">
                Technology Built Around{' '}
                <span className="gradient-text-gold">Your Industry</span>
              </h1>
              <p className="industries-hero__desc">
                We build purpose-engineered software around verified operational workflows, rigorous data security,
                and long-term scalability across key industry domains.
              </p>

              {/* Interactive Sector Filter */}
              <div className="industries-filter" role="tablist" aria-label="Filter industries by domain">
                {SECTOR_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={selectedSector === tab.id}
                    className={`industries-filter__btn${
                      selectedSector === tab.id ? ' industries-filter__btn--active' : ''
                    }`}
                    onClick={() => setSelectedSector(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Industries Grid Section */}
        <section className="industries-grid-section section" id="industries-grid">
          <div className="container">
            <div className="industries-grid">
              {filteredIndustries.map((ind) => {
                const IconComponent = ind.icon;
                return (
                  <article key={ind.id} className="industry-card" id={ind.id}>
                    <div className="industry-card__header">
                      <div className="industry-card__icon-wrap" aria-hidden="true">
                        <IconComponent size={22} />
                      </div>
                      <span className="industry-card__tag">Enterprise</span>
                    </div>

                    <h3 className="industry-card__title">{ind.name}</h3>
                    <p className="industry-card__desc">{ind.description}</p>

                    <div className="industry-card__capabilities">
                      <h4 className="industry-card__caps-title">Key Capabilities</h4>
                      <ul className="industry-card__caps-list">
                        {ind.capabilities.map((cap, i) => (
                          <li key={i} className="industry-card__cap-item">
                            <CheckIcon size={14} className="industry-card__cap-icon" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="industry-card__footer">
                      <Link to="/contact" className="industry-card__link">
                        <span>Inquire for this industry</span>
                        <ArrowRightIcon size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="industries-cta section">
          <div className="container">
            <div className="industries-cta__card">
              <div className="industries-cta__content">
                <h2>Have a custom domain challenge?</h2>
                <p>
                  Our senior engineering team conducts architectural assessments to design software tailored specifically to your operational demands.
                </p>
              </div>
              <div className="industries-cta__actions">
                <Link to="/contact" className="btn btn-primary">
                  <span>Start a Conversation</span>
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
