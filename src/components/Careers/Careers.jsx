import { CAREERS, COMPANY } from '../../data/content';
import './Careers.css';

export default function Careers() {
  return (
    <section className="careers section" id="careers" aria-labelledby="careers-heading">
      <div className="container">
        <div className="careers__inner">
          {/* Header */}
          <div className="careers__header">
            <p className="section-label reveal">Join Us</p>
            <h2 id="careers-heading" className="reveal reveal--delay-1">
              Build Your Future{' '}
              <span className="gradient-text">With Us</span>
            </h2>
            <p className="careers__desc reveal reveal--delay-2">
              Ashivam Technologies is building a collaborative technology team and welcomes
              developers, designers, learners and motivated contributors. Many opportunities
              are contribution-based or internship-style — perfect for those looking to grow,
              learn and build real products.
            </p>
            <div className="careers__ctas reveal reveal--delay-3">
              <a
                href={`mailto:${COMPANY.email}`}
                className="btn btn-primary"
                id="careers-cta-join"
              >
                Join Our Team
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a
                href={`mailto:${COMPANY.email}?subject=Open%20Opportunities`}
                className="btn btn-outline"
                id="careers-cta-view"
              >
                View Open Opportunities
              </a>
            </div>
          </div>

          {/* Opportunities list */}
          <div className="careers__list" aria-label="Open positions">
            {CAREERS.map((c, i) => (
              <div
                key={c.role}
                className={`career-item reveal reveal--right reveal--delay-${(i % 4) + 1}${!c.open ? ' career-item--closed' : ''}`}
                aria-label={`${c.role} — ${c.type}${!c.open ? ' — Currently closed' : ''}`}
              >
                <div className="career-item__left">
                  <div className={`career-item__status ${c.open ? 'career-item__status--open' : 'career-item__status--closed'}`}>
                    {c.open ? 'Open' : 'Closed'}
                  </div>
                  <div>
                    <h3 className="career-item__role">{c.role}</h3>
                    <p className="career-item__type">{c.type}</p>
                  </div>
                </div>
                {c.open && (
                  <a
                    href={`mailto:${COMPANY.email}?subject=Application%20for%20${encodeURIComponent(c.role)}`}
                    className="career-item__apply"
                    aria-label={`Apply for ${c.role}`}
                  >
                    Apply
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
