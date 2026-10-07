import { useRef } from 'react';
import { SOLUTIONS } from '../../data/content';
import { SOLUTION_ICON_MAP, ArrowRightIcon } from '../icons';
import './Solutions.css';

function SolutionCard({ sol, index }) {
  const cardRef = useRef(null);
  const IconComponent = SOLUTION_ICON_MAP[sol.id];

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
  };

  const scrollToContact = (e) => {
    e.preventDefault();
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      ref={cardRef}
      className={`solution-card reveal reveal--scale reveal--delay-${(index % 3) + 1}`}
      onMouseMove={handleMouseMove}
      style={{ '--gradient': sol.gradient }}
      role="article"
      aria-labelledby={`solution-${sol.id}-title`}
    >
      <div className="solution-card__spotlight" aria-hidden="true" />
      
      <div className="solution-card__top">
        <div className="solution-card__icon-wrap" aria-hidden="true">
          {IconComponent && <IconComponent size={24} className="solution-card__icon" />}
        </div>
        <a
          href="#contact"
          onClick={scrollToContact}
          className="solution-card__arrow"
          aria-label={`Inquire about ${sol.title}`}
        >
          <ArrowRightIcon size={16} />
        </a>
      </div>

      <h3 id={`solution-${sol.id}-title`} className="solution-card__title">
        {sol.title}
      </h3>
      <p className="solution-card__desc">{sol.description}</p>
    </div>
  );
}

export default function Solutions() {
  return (
    <section className="solutions section" id="solutions" aria-labelledby="solutions-heading">
      <div className="container">
        <div className="solutions__header">
          <p className="section-label reveal">Industry Domains</p>
          <h2 id="solutions-heading" className="reveal reveal--delay-1">
            Engineered For{' '}
            <span className="gradient-text-gold">Real-World Impact</span>
          </h2>
          <p className="solutions__subtitle reveal reveal--delay-2">
            We deliver tailored software solutions across diverse industry domains, 
            solving mission-critical operational challenges through intelligent technology.
          </p>
        </div>

        <div className="solutions__grid" role="list">
          {SOLUTIONS.map((sol, i) => (
            <SolutionCard key={sol.id} sol={sol} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
