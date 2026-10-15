import { LightbulbIcon, GearIcon, ShieldIcon, RocketIcon, ArrowRightIcon } from '../icons';
import { trackCtaClick } from '../../utils/analytics';
import './Process.css';

const STEPS = [
  {
    step: '01',
    phase: 'Architecture & Discovery',
    icon: LightbulbIcon,
    title: 'Requirements & Blueprint',
    description:
      'We evaluate operational constraints, map end-user workflows, and establish data models and API contracts before touching code.',
    deliverable: 'System Architecture Specification & Milestones',
  },
  {
    step: '02',
    phase: 'Agile Engineering',
    icon: GearIcon,
    title: 'Sprint Iteration & Prototyping',
    description:
      'Two-week sprint cycles delivering clean, testable increments with continuous client visibility, staged deployments, and code reviews.',
    deliverable: 'Modular Code & Bi-Weekly Demo Previews',
  },
  {
    step: '03',
    phase: 'Quality & Security',
    icon: ShieldIcon,
    title: 'Automated QA & Security Audits',
    description:
      'Automated Test Suites & Regression Checks alongside Security Hardening & Dependency Audits across all platforms.',
    deliverable: 'Automated Test Suites & Security Hardening',
  },
  {
    step: '04',
    phase: 'Deployment & SLA',
    icon: RocketIcon,
    title: 'Production Launch & Reliability',
    description:
      'Automated CI/CD deployment pipelines, environment hardening, continuous telemetry monitoring, and ongoing support.',
    deliverable: 'Production CI/CD Automation & Proactive Monitoring',
  },
];

export default function Process() {
  const scrollToContact = (e) => {
    e.preventDefault();
    trackCtaClick('Initiate Your Architecture Review', '#contact');
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="process" id="process" aria-labelledby="process-heading">
      <div className="container">
        <header className="process__header">
          <span className="process__eyebrow">Delivery Lifecycle</span>
          <h2 id="process-heading" className="process__title">
            From Discovery to <span className="gradient-text-gold">Delivery</span>
          </h2>
          <p className="process__subtitle">
            A disciplined four-phase engineering framework designed to mitigate project risk and deliver production-grade software on schedule.
          </p>
        </header>

        <div className="process__grid" role="list">
          {STEPS.map((s) => {
            const IconComp = s.icon;
            return (
              <article
                key={s.step}
                className="process-card"
                role="article"
                aria-labelledby={`process-step-${s.step}`}
              >
                <div className="process-card__top">
                  <span className="process-card__step">{s.step}</span>
                  <div className="process-card__icon-wrap" aria-hidden="true">
                    <IconComp size={18} />
                  </div>
                </div>

                <div className="process-card__phase">{s.phase}</div>
                <h3 id={`process-step-${s.step}`} className="process-card__title">
                  {s.title}
                </h3>
                <p className="process-card__desc">{s.description}</p>

                <div className="process-card__deliverable">
                  <span className="process-card__deliv-badge">Deliverable</span>
                  <span className="process-card__deliv-text">{s.deliverable}</span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="process__actions">
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
