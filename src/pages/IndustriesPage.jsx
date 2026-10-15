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
    summary: 'Comprehensive platforms for universities and training providers, uniting attendance engines with student portals.',
    capabilities: [
      'Digital student portals & academic hubs',
      'Automated attendance & reporting engines',
      'Secure exam workflows & grade management',
      'Real-time communication & alert channels',
    ],
  },
  {
    id: 'enterprise-erp',
    icon: ServerIcon,
    name: 'Enterprise & Business Operations',
    summary: 'Bespoke ERP systems that eliminate operational friction and unify inventory, invoicing, and team allocations.',
    capabilities: [
      'Custom ERP & inventory lifecycle platforms',
      'Automated billing & ledger pipelines',
      'Role-governed task assignment workflows',
      'Executive dashboard metrics & analytics',
    ],
  },
  {
    id: 'management',
    icon: ShieldIcon,
    name: 'Management & Organizational Systems',
    summary: 'Secure enterprise platforms guaranteeing role-based access, policy acknowledgments, and audit-ready records.',
    capabilities: [
      'Employee lifecycle & records systems',
      'Private employee document verification vaults',
      'HR policy publishing & acknowledgments',
      'Role-based access control (RBAC) & audits',
    ],
  },
  {
    id: 'digital-platforms',
    icon: CodeIcon,
    name: 'Digital Platforms & Modern Commerce',
    summary: 'Sub-second consumer web applications built with React, responsive state management, and optimized conversion paths.',
    capabilities: [
      'High-speed, SEO-engineered web applications',
      'Responsive design across mobile and desktop',
      'Secure payment gateways & transaction flows',
      'Real-time state synchronization engines',
    ],
  },
  {
    id: 'automation',
    icon: GearIcon,
    name: 'Smart Operations & Process Automation',
    summary: 'Background job processors, webhook pipelines, and automated bridges connecting disparate tools into one flow.',
    capabilities: [
      'Scheduled background jobs & batch workers',
      'Automated email notifications & event hooks',
      'API gateway bridges & integrations',
      'Telemetry logging & system health probes',
    ],
  },
  {
    id: 'mobile-ecosystem',
    icon: RocketIcon,
    name: 'Mobile Engineering & Field Operations',
    summary: 'Native Android and hybrid applications with 60fps responsiveness, offline sync, and field-ready ergonomics.',
    capabilities: [
      'Native Android applications in Kotlin',
      'Local-first SQLite & encrypted cache persistence',
      'Background geolocation & sync workflows',
      'Biometric authentication & secure storage',
    ],
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
        <section className="industries-section">
          <div className="container">
            {/* Compact Header & Integrated Filter */}
            <header className="industries-header">
              <span className="industries-eyebrow">Enterprise Domain Architecture</span>
              <h1 className="industries-title">
                Technology Built Around{' '}
                <span className="gradient-text-gold">Your Industry</span>
              </h1>
              <p className="industries-subtitle">
                Purpose-engineered software tailored to verified operational workflows, security demands, and domain-specific scale.
              </p>

              {/* Sector Filter Pills */}
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
            </header>

            {/* Compact 3-Column Sector Grid */}
            <div className="industries-grid" id="industries-grid">
              {filteredIndustries.map((ind, index) => {
                const IconComponent = ind.icon;
                return (
                  <article key={ind.id} className="industry-card" id={ind.id}>
                    <div className="industry-card__header">
                      <div className="industry-card__icon-wrap" aria-hidden="true">
                        <IconComponent size={20} />
                      </div>
                      <span className="industry-card__index">0{index + 1}</span>
                    </div>

                    <h2 className="industry-card__title">{ind.name}</h2>
                    <p className="industry-card__summary">{ind.summary}</p>

                    <ul className="industry-card__capabilities">
                      {ind.capabilities.map((cap, i) => (
                        <li key={i} className="industry-card__cap-item">
                          <CheckIcon size={13} className="industry-card__cap-icon" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>

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

        {/* Compact Bottom CTA Banner */}
        <section className="industries-cta">
          <div className="container">
            <div className="industries-cta__card">
              <div className="industries-cta__content">
                <h3>Have a custom domain challenge?</h3>
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
