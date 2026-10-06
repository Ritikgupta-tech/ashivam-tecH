import { useRef } from 'react';
import { SOLUTIONS } from '../../data/content';
import './Solutions.css';

function SolutionCard({ sol, index }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
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
        <div className="solution-card__icon-wrap">
          <span className="solution-card__icon" aria-hidden="true">{sol.icon}</span>
        </div>
        <div className="solution-card__arrow" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <h3 id={`solution-${sol.id}-title`} className="solution-card__title">{sol.title}</h3>
      <p className="solution-card__desc">{sol.description}</p>
    </div>
  );
}

export default function Solutions() {
  return (
    <section className="solutions section" id="solutions" aria-labelledby="solutions-heading">
      <div className="container">
        <div className="solutions__header">
          <p className="section-label reveal">Our Solutions</p>
          <h2 id="solutions-heading" className="reveal reveal--delay-1">
            Technology With{' '}
            <span className="gradient-text">Real-World Impact</span>
          </h2>
          <p className="solutions__subtitle reveal reveal--delay-2">
            We build across diverse domains, creating solutions that solve real problems
            for real people in meaningful ways.
          </p>
        </div>
        <div className="solutions__grid">
          {SOLUTIONS.map((sol, i) => (
            <SolutionCard key={sol.id} sol={sol} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
