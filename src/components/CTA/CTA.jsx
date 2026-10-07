import { RocketIcon, LightbulbIcon, ActivityIcon, ArrowRightIcon } from '../icons';
import './CTA.css';

export default function CTA() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="cta-section section" id="cta" aria-labelledby="cta-heading">
      {/* Background Lighting */}
      <div className="cta-section__bg" aria-hidden="true">
        <div className="cta-section__orb cta-section__orb--gold" />
        <div className="cta-section__grid" />
        <div className="cta-section__particles" />
      </div>

      <div className="container">
        <div className="cta-section__content">
          <p className="section-label reveal">Initiate Engagement</p>
          <h2 id="cta-heading" className="cta-section__heading reveal reveal--delay-1">
            Have an Enterprise Vision?{' '}
            <span className="gradient-text-gold">Let's Build It.</span>
          </h2>
          <p className="cta-section__desc reveal reveal--delay-2">
            Whether you require enterprise web applications, mobile platforms, custom software architectures, 
            or AI solutions — Ashivam Technologies engineers your vision into high-performance digital reality.
          </p>
          <div className="cta-section__buttons reveal reveal--delay-3">
            <button
              className="btn btn-primary cta-section__btn-primary"
              onClick={() => scrollTo('contact')}
              id="cta-start-conversation"
            >
              <span>Start a Consultation</span>
              <ArrowRightIcon size={16} />
            </button>
            <button
              className="btn btn-outline"
              onClick={() => scrollTo('services')}
              id="cta-explore-services"
            >
              Explore Capabilities
            </button>
          </div>

          {/* Glass cards floating with SVG icons */}
          <div className="cta-section__glass-elements" aria-hidden="true">
            <div className="cta-glass-card float-1">
              <RocketIcon size={16} className="cta-glass-icon" />
              <span>Production Ready</span>
            </div>
            <div className="cta-glass-card float-2">
              <LightbulbIcon size={16} className="cta-glass-icon" />
              <span>Concept to Reality</span>
            </div>
            <div className="cta-glass-card float-3">
              <ActivityIcon size={16} className="cta-glass-icon" />
              <span>Agile Execution</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
