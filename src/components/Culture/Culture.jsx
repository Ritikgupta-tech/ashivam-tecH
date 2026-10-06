import { CULTURE } from '../../data/content';
import './Culture.css';

export default function Culture() {
  return (
    <section className="culture section" id="culture" aria-labelledby="culture-heading">
      <div className="container">
        <div className="culture__header">
          <p className="section-label reveal">Our Culture</p>
          <h2 id="culture-heading" className="reveal reveal--delay-1">
            Remote. <span className="gradient-text">Collaborative.</span> Curious.
          </h2>
          <p className="culture__subtitle reveal reveal--delay-2">
            We build async-first, communicate openly and celebrate learning at every step.
          </p>
        </div>
        <div className="culture__grid">
          {CULTURE.map((item, i) => (
            <div
              key={item.title}
              className={`culture-card reveal reveal--scale reveal--delay-${(i % 3) + 1}`}
              role="article"
            >
              <div className="culture-card__icon" aria-hidden="true">{item.icon}</div>
              <h3 className="culture-card__title">{item.title}</h3>
              <p className="culture-card__desc">{item.desc}</p>
              <div className="culture-card__connector" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
