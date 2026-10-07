import { CAREERS, COMPANY } from '../../data/content';
import { ArrowRightIcon } from '../icons';
import './Careers.css';

export default function Careers() {
  return (
    <section className="careers section" id="careers" aria-labelledby="careers-heading">
      <div className="container">
        <div className="careers__inner">
          {/* Header */}
          <div className="careers__header">
            <p className="section-label reveal">Opportunities</p>
            <h2 id="careers-heading" className="reveal reveal--delay-1">
              Build Your Future{' '}
              <span className="gradient-text-gold">With Ashivam</span>
            </h2>
            <p className="careers__desc reveal reveal--delay-2">
              Ashivam Technologies is building a collaborative software engineering culture in Agra, India, 
              welcoming talented developers, architects, UI/UX designers, and innovative thinkers. 
              We offer contribution-based and internship roles engineered for deep technical growth.
            </p>
            <div className="careers__ctas reveal reveal--delay-3">
              <a
                href={`mailto:${COMPANY.email}?subject=Application%20for%20Ashivam%20Technologies`}
                className="btn btn-primary"
                id="careers-cta-join"
              >
                <span>Join Our Engineering Team</span>
                <ArrowRightIcon size={16} />
              </a>
              <a
                href={`mailto:${COMPANY.email}?subject=General%20Careers%20Inquiry`}
                className="btn btn-outline"
                id="careers-cta-view"
              >
                Inquire Positions
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
                    {c.open ? 'Open Position' : 'Position Filled'}
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
                    <span>Apply</span>
                    <ArrowRightIcon size={13} />
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
