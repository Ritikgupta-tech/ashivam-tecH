import { WHY_ASHIVAM } from '../../data/content';
import { PRINCIPLE_ICON_MAP, ArrowRightIcon } from '../icons';
import './WhyAshivam.css';

export default function WhyAshivam() {
  const scrollToContact = (e) => {
    e.preventDefault();
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="why section" id="why" aria-labelledby="why-heading">
      <div className="container">
        <div className="why__inner">
          {/* Left Column */}
          <div className="why__left">
            <p className="section-label reveal">Our Principles</p>
            <h2 id="why-heading" className="why__heading reveal reveal--delay-1">
              Why Build With{' '}
              <span className="gradient-text-gold">Ashivam?</span>
            </h2>
            <p className="why__desc reveal reveal--delay-2">
              We do not simply write code — we think deeply about software architecture,
              engineer for resilience, and design intuitive products built to stand the test of time.
            </p>
            <a
              href="#contact"
              className="btn btn-primary why__cta reveal reveal--delay-3"
              onClick={scrollToContact}
            >
              <span>Start a Conversation</span>
              <ArrowRightIcon size={16} />
            </a>
          </div>

          {/* Right Column: Timeline Principle Cards */}
          <div className="why__right">
            <div className="why__timeline" aria-label="Key reasons to work with Ashivam">
              {WHY_ASHIVAM.map((item, i) => {
                const IconComponent = PRINCIPLE_ICON_MAP[item.title];
                return (
                  <div
                    key={item.title}
                    className={`why-card reveal reveal--right reveal--delay-${i + 1}`}
                    role="article"
                  >
                    <div className="why-card__connector" aria-hidden="true">
                      <div className="why-card__line" />
                      <div className="why-card__dot" />
                    </div>
                    <div className="why-card__content">
                      <div className="why-card__icon-wrap" aria-hidden="true">
                        {IconComponent && <IconComponent size={22} className="why-card__icon" />}
                      </div>
                      <div className="why-card__text">
                        <h3 className="why-card__title">{item.title}</h3>
                        <p className="why-card__desc">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
