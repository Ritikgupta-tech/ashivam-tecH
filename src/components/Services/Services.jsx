import { useRef } from 'react';
import { SERVICES } from '../../data/content';
import { SERVICE_ICON_MAP, ArrowRightIcon } from '../icons';
import './Services.css';

function ServiceCard({ service, index }) {
  const cardRef = useRef(null);
  const IconComponent = SERVICE_ICON_MAP[service.id];

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -6;
    const rotY = ((x - cx) / cx) * 6;
    card.style.transform = `perspective(800px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-5px)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = '';
    }
  };

  const scrollToContact = (e) => {
    e.preventDefault();
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      ref={cardRef}
      className={`service-card reveal reveal--scale reveal--delay-${(index % 3) + 1}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="article"
      aria-labelledby={`service-${service.id}-title`}
    >
      <div className="service-card__top">
        <div className="service-card__icon-wrapper" aria-hidden="true">
          {IconComponent && <IconComponent size={26} className="service-card__icon" />}
          <div className="service-card__icon-glow" />
        </div>
        <span className="service-card__index">0{index + 1}</span>
      </div>

      <h3 id={`service-${service.id}-title`} className="service-card__title">
        {service.title}
      </h3>
      <p className="service-card__desc">{service.description}</p>

      <div className="service-card__footer">
        <a href="#contact" onClick={scrollToContact} className="service-card__explore" aria-label={`Inquire about ${service.title}`}>
          <span>Start Consultation</span>
          <ArrowRightIcon size={14} className="service-card__arrow" />
        </a>
      </div>
    </div>
  );
}

export default function Services() {
  return (
    <section className="services section" id="services" aria-labelledby="services-heading">
      <div className="container">
        <div className="services__header">
          <p className="section-label reveal">Engineering Capabilities</p>
          <h2 id="services-heading" className="reveal reveal--delay-1">
            What We <span className="gradient-text-gold">Engineer</span>
          </h2>
          <p className="services__subtitle reveal reveal--delay-2">
            End-to-end software engineering, high-performance product architectures, 
            and digital solutions crafted with craftsmanship and enterprise reliability.
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
