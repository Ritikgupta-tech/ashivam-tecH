import './CTA.css';

export default function CTA() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="cta-section section" id="cta" aria-labelledby="cta-heading">
      {/* Background */}
      <div className="cta-section__bg" aria-hidden="true">
        <div className="cta-section__orb" />
        <div className="cta-section__grid" />
        <div className="cta-section__particles" />
      </div>

      <div className="container">
        <div className="cta-section__content">
          <p className="section-label reveal">Ready to Start?</p>
          <h2 id="cta-heading" className="cta-section__heading reveal reveal--delay-1">
            Have an Idea?{' '}
            <span className="gradient-text">Let's Build It.</span>
          </h2>
          <p className="cta-section__desc reveal reveal--delay-2">
            Whether it's a software product, mobile application, web platform or a new
            digital idea — Ashivam Technologies can turn concepts into meaningful technology.
          </p>
          <div className="cta-section__buttons reveal reveal--delay-3">
            <button
              className="btn btn-primary cta-section__btn-primary"
              onClick={() => scrollTo('contact')}
              id="cta-start-conversation"
            >
              Start a Conversation
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => scrollTo('services')}
              id="cta-explore-services"
            >
              Explore Services
            </button>
          </div>

          {/* Glass cards floating */}
          <div className="cta-section__glass-elements" aria-hidden="true">
            <div className="cta-glass-card float-1">
              <span>🚀</span> Project Ready
            </div>
            <div className="cta-glass-card float-2">
              <span>💡</span> Idea to Reality
            </div>
            <div className="cta-glass-card float-3">
              <span>⚡</span> Fast Execution
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
