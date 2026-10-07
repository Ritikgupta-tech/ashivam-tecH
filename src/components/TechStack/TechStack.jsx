import { useState, useRef } from 'react';
import { TECH_LAYERS } from '../../data/content';
import {
  ReactIcon,
  JavaScriptIcon,
  TypeScriptIcon,
  JavaIcon,
  SpringBootIcon,
  PythonIcon,
  AndroidIcon,
  KotlinIcon,
  MySQLIcon,
  FirebaseIcon,
  GitIcon,
  FigmaIcon,
} from '../icons';
import './TechStack.css';

const ICON_COMPONENTS = {
  React: ReactIcon,
  JavaScript: JavaScriptIcon,
  TypeScript: TypeScriptIcon,
  Java: JavaIcon,
  'Spring Boot': SpringBootIcon,
  Python: PythonIcon,
  Android: AndroidIcon,
  Kotlin: KotlinIcon,
  MySQL: MySQLIcon,
  Firebase: FirebaseIcon,
  Git: GitIcon,
  Figma: FigmaIcon,
};

function TechCard({ item, activeFilter }) {
  const cardRef = useRef(null);
  const IconComponent = ICON_COMPONENTS[item.name];

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = (y / (rect.height / 2)) * -5;
    const rotY = (x / (rect.width / 2)) * 5;
    card.style.transform = `perspective(600px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = '';
    }
  };

  const isDimmed = activeFilter !== 'all' && item.category !== activeFilter;
  const isHighlighted = activeFilter !== 'all' && item.category === activeFilter;

  return (
    <div
      ref={cardRef}
      className={`tech-node${isDimmed ? ' tech-node--dimmed' : ''}${isHighlighted ? ' tech-node--highlighted' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="listitem"
      tabIndex={0}
      aria-label={`${item.name} — ${item.role}`}
    >
      <div className="tech-node__icon-wrap">
        {IconComponent && <IconComponent size={28} className="tech-node__icon" />}
        <div className="tech-node__icon-glow" aria-hidden="true" />
      </div>
      <div className="tech-node__content">
        <span className="tech-node__name">{item.name}</span>
        <span className="tech-node__role">{item.role}</span>
      </div>
      <div className="tech-node__status-dot" aria-hidden="true" />
    </div>
  );
}

export default function TechStack() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filterOptions = [
    { id: 'all', label: 'Complete Ecosystem' },
    { id: 'frontend', label: 'Frontend' },
    { id: 'backend', label: 'Backend' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'database', label: 'Database' },
    { id: 'tools', label: 'Tools & Design' },
  ];

  return (
    <section className="techstack section" id="techstack" aria-labelledby="techstack-heading">
      <div className="container">
        {/* Section Header */}
        <div className="techstack__header">
          <p className="section-label reveal">Engineering Infrastructure</p>
          <h2 id="techstack-heading" className="reveal reveal--delay-1">
            Technology <span className="gradient-text-gold">Ecosystem</span>
          </h2>
          <p className="techstack__subtitle reveal reveal--delay-2">
            A unified, interconnected technology network engineered for high performance, 
            enterprise scalability, and mission-critical reliability.
          </p>
        </div>

        {/* Filter Navigation */}
        <div className="techstack__controls reveal reveal--delay-2" role="tablist" aria-label="Ecosystem filter">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              role="tab"
              aria-selected={activeFilter === opt.id}
              className={`techstack__filter-btn${activeFilter === opt.id ? ' techstack__filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Main Wide Ecosystem Glass Container */}
        <div className="techstack__network-wrapper reveal reveal--scale reveal--delay-3">
          {/* Background Data Flow Canvas Lines (SVG) */}
          <div className="techstack__bus-circuit" aria-hidden="true">
            <svg className="techstack__bus-svg" viewBox="0 0 1200 480" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="busGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(230, 197, 92, 0.3)" />
                  <stop offset="50%" stopColor="rgba(56, 189, 248, 0.3)" />
                  <stop offset="100%" stopColor="rgba(230, 197, 92, 0.3)" />
                </linearGradient>
                <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e6c55c" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>

              {/* Horizontal Connecting Buses */}
              <path d="M 120 130 H 1080" stroke="url(#busGrad)" strokeWidth="1.5" strokeDasharray="4 6" className="bus-flow-line" />
              <path d="M 120 250 H 1080" stroke="url(#busGrad)" strokeWidth="1.5" strokeDasharray="4 6" className="bus-flow-line bus-flow-line--delay" />
              <path d="M 120 370 H 1080" stroke="url(#busGrad)" strokeWidth="1.5" strokeDasharray="4 6" className="bus-flow-line" />

              {/* Vertical Junction Lines */}
              <line x1="240" y1="90" x2="240" y2="400" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />
              <line x1="480" y1="90" x2="480" y2="400" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />
              <line x1="720" y1="90" x2="720" y2="400" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />
              <line x1="960" y1="90" x2="960" y2="400" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />

              {/* Data Flow Pulse Circles */}
              <circle cx="200" cy="130" r="3.5" fill="#e6c55c" className="bus-pulse-dot bus-pulse-1" />
              <circle cx="500" cy="250" r="3.5" fill="#60a5fa" className="bus-pulse-dot bus-pulse-2" />
              <circle cx="850" cy="370" r="3.5" fill="#e6c55c" className="bus-pulse-dot bus-pulse-3" />
            </svg>
          </div>

          {/* Network Header Status Bar */}
          <div className="techstack__status-bar">
            <div className="techstack__status-indicator">
              <span className="techstack__live-pulse" aria-hidden="true" />
              <span className="techstack__status-label">ENGINEERING ARCHITECTURE PIPELINE</span>
            </div>
            <div className="techstack__flow-badge">
              <span>Client Layer</span>
              <span className="techstack__flow-arrow">→</span>
              <span>API Gateway</span>
              <span className="techstack__flow-arrow">→</span>
              <span>Services</span>
              <span className="techstack__flow-arrow">→</span>
              <span>Data Store</span>
            </div>
          </div>

          {/* Horizontal Layers Grid */}
          <div className="techstack__layers" role="list">
            {TECH_LAYERS.map((layer, idx) => (
              <div
                key={layer.id}
                className={`tech-layer${activeFilter !== 'all' && activeFilter !== layer.id ? ' tech-layer--dimmed' : ''}`}
                role="group"
                aria-label={layer.label}
              >
                <div className="tech-layer__header">
                  <div className="tech-layer__badge">
                    <span className="tech-layer__index">0{idx + 1}</span>
                    <h3 className="tech-layer__title">{layer.shortLabel}</h3>
                  </div>
                  <span className="tech-layer__connector-pip" aria-hidden="true" />
                </div>

                <div className="tech-layer__items">
                  {layer.items.map((item) => (
                    <TechCard key={item.name} item={item} activeFilter={activeFilter} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Architecture Protocol Specs */}
          <div className="techstack__specs-bar">
            <div className="techstack__spec-item">
              <span className="techstack__spec-code">ARCH</span>
              <span className="techstack__spec-text">Clean Microservices & Event Architecture</span>
            </div>
            <div className="techstack__spec-item">
              <span className="techstack__spec-code">SYNC</span>
              <span className="techstack__spec-text">Real-Time Cloud & Local Persistence</span>
            </div>
            <div className="techstack__spec-item">
              <span className="techstack__spec-code">DEPLOY</span>
              <span className="techstack__spec-text">Automated CI/CD & Production Pipelines</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
