import { CULTURE } from '../../data/content';
import { CULTURE_ICON_MAP } from '../icons';
import './Culture.css';

export default function Culture() {
  return (
    <section className="culture section" id="culture" aria-labelledby="culture-heading">
      <div className="container">
        <div className="culture__header">
          <p className="section-label reveal">Engineering Culture</p>
          <h2 id="culture-heading" className="reveal reveal--delay-1">
            Async-First. <span className="gradient-text-gold">Collaborative.</span> Impact-Driven.
          </h2>
          <p className="culture__subtitle reveal reveal--delay-2">
            We build high-trust distributed workflows, communicate transparently, and foster technical excellence.
          </p>
        </div>
        <div className="culture__grid" role="list">
          {CULTURE.map((item, i) => {
            const IconComponent = CULTURE_ICON_MAP[item.title];
            return (
              <div
                key={item.title}
                className={`culture-card reveal reveal--scale reveal--delay-${(i % 3) + 1}`}
                role="article"
              >
                <div className="culture-card__icon-wrap" aria-hidden="true">
                  {IconComponent && <IconComponent size={22} className="culture-card__icon" />}
                </div>
                <h3 className="culture-card__title">{item.title}</h3>
                <p className="culture-card__desc">{item.desc}</p>
                <div className="culture-card__connector" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
