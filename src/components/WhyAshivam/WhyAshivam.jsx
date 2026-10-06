import { WHY_ASHIVAM } from '../../data/content';
import './WhyAshivam.css';

export default function WhyAshivam() {
  return (
    <section className="why section" id="why" aria-labelledby="why-heading">
      <div className="container">
        <div className="why__inner">
          {/* Left */}
          <div className="why__left">
            <p className="section-label reveal">Why Choose Us</p>
            <h2 id="why-heading" className="why__heading reveal reveal--delay-1">
              Why Build With{' '}
              <span className="gradient-text-gold">Ashivam?</span>
            </h2>
            <p className="why__desc reveal reveal--delay-2">
              We don't just write code — we think deeply about problems, 
              design thoughtfully, and build software that stands the test of time.
            </p>
            <a
              href="#contact"
              className="btn btn-primary reveal reveal--delay-3"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Start a Conversation
            </a>
          </div>

          {/* Right: Timeline cards */}
          <div className="why__right">
            <div className="why__timeline" aria-label="Key reasons to work with Ashivam">
              {WHY_ASHIVAM.map((item, i) => (
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
                    <div className="why-card__icon" aria-hidden="true">{item.icon}</div>
                    <div>
                      <h3 className="why-card__title">{item.title}</h3>
                      <p className="why-card__desc">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
