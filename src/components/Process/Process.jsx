import { LightbulbIcon, GearIcon, ShieldIcon, RocketIcon, ArrowRightIcon } from '../icons';
import { trackCtaClick } from '../../utils/analytics';
import './Process.css';

const STEPS = [
  {
    step: '01',
    phase: 'Architecture & Discovery',
    icon: LightbulbIcon,
    title: 'Requirements & Domain Blueprint',
    description:
      'We evaluate operational constraints, map end-user workflows, and establish data models and API contracts before touching code.',
    deliverables: ['System Architecture Document', 'Database Schema Specification', 'Sprint Roadmap & Milestones'],
  },
  {
    step: '02',
    phase: 'Agile Engineering',
    icon: GearIcon,
    title: 'Sprint Iteration & Prototyping',
    description:
      'Two-week sprint cycles delivering clean, testable code increments. Continuous client visibility via staged preview deployments and code reviews.',
    deliverables: ['Working Feature Branches', 'Bi-Weekly Demo Reviews', 'Clean Git Version History'],
  },
  {
    step: '03',
    phase: 'Quality & Security',
    icon: ShieldIcon,
    title: 'Automated QA & Security Audits',
    description:
      'Strict regression testing, cross-breakpoint mobile verification, least-privilege security controls, and performance tuning.',
    deliverables: ['Automated Test Suite Pass (100%)', 'Zero-Vulnerability Audits', 'Mobile & Accessibility Validation'],
  },
  {
    step: '04',
    phase: 'Deployment & SLA',
    icon: RocketIcon,
    title: 'Production Launch & Reliability',
    description:
      'Zero-downtime deployment pipelines, environment hardening, continuous monitoring, and ongoing technical support for your enterprise software.',
    deliverables: ['Production CI/CD Automation', 'Telemetry & Health Probes', 'Ongoing Maintenance & Support'],
  },
];

export default function Process() {
  const scrollToContact = (e) => {
    e.preventDefault();
    trackCtaClick('Initiate Your Architecture Review', '#contact');
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="process section" id="process" aria-labelledby="process-heading">
      <div className="container">
        <div className="process__header">
          <p className="section-label reveal">Delivery Lifecycle</p>
          <h2 id="process-heading" className="reveal reveal--delay-1">
            How We <span className="gradient-text-gold">Engineer & Deliver</span>
          </h2>
          <p className="section-subtitle reveal reveal--delay-2">
            A disciplined, transparent delivery framework designed to eliminate guesswork, mitigate project risk, and deliver production-grade software on schedule.
          </p>
        </div>

        <div className="process__grid" role="list">
          {STEPS.map((s, i) => {
            const IconComp = s.icon;
            return (
              <article
                key={s.step}
                className={`process-card reveal reveal--delay-${i + 1}`}
                role="article"
                aria-labelledby={`process-step-${s.step}`}
              >
                <div className="process-card__top">
                  <span className="process-card__step">{s.step}</span>
                  <div className="process-card__icon-wrap" aria-hidden="true">
                    <IconComp size={22} />
                  </div>
                </div>

                <div className="process-card__phase">{s.phase}</div>
                <h3 id={`process-step-${s.step}`} className="process-card__title">
                  {s.title}
                </h3>
                <p className="process-card__desc">{s.description}</p>

                <div className="process-card__deliverables">
                  <div className="process-card__deliv-title">Core Deliverables</div>
                  <ul className="process-card__deliv-list">
                    {s.deliverables.map((deliv, idx) => (
                      <li key={idx} className="process-card__deliv-item">
                        <span className="process-card__deliv-dot" aria-hidden="true" />
                        <span>{deliv}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>

        <div className="process__actions reveal reveal--delay-3">
          <a
            href="#contact"
            onClick={scrollToContact}
            className="btn btn-primary"
            id="process-cta-consult"
          >
            <span>Initiate Your Architecture Review</span>
            <ArrowRightIcon size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
