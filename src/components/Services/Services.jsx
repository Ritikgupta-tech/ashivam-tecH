import { useRef, useEffect, useState } from 'react';
import { SERVICES } from '../../data/content';
import './Services.css';

function ServiceCard({ service, index }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -8;
    const rotY = ((x - cx) / cx) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = '';
    }
  };

  return (
    <div
      ref={cardRef}
      className={`service-card reveal reveal--scale reveal--delay-${(index % 3) + 1}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ '--accent': service.color }}
      role="article"
      aria-labelledby={`service-${service.id}-title`}
    >
      <div className="service-card__glow" aria-hidden="true" />
      <div className="service-card__icon" aria-hidden="true">{service.icon}</div>
      <h3 id={`service-${service.id}-title`} className="service-card__title">{service.title}</h3>
      <p className="service-card__desc">{service.description}</p>
      <div className="service-card__footer">
        <span className="service-card__explore">
          Explore
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className="service-card__border-glow" aria-hidden="true" />
    </div>
  );
}

export default function Services() {
  return (
    <section className="services section" id="services" aria-labelledby="services-heading">
      <div className="container">
        <div className="services__header">
          <p className="section-label reveal">What We Do</p>
          <h2 id="services-heading" className="reveal reveal--delay-1">
            What We <span className="gradient-text">Build</span>
          </h2>
          <p className="services__subtitle reveal reveal--delay-2">
            End-to-end software engineering and digital solutions crafted with care,
            precision and a relentless focus on quality.
          </p>
        </div>
        <div className="services__grid" role="list">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
