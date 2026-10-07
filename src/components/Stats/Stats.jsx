import { useEffect, useRef, useState } from 'react';
import { STATS } from '../../data/content';
import { STAT_ICON_MAP } from '../icons';
import './Stats.css';

function useCountUp(target, duration = 1800, isVisible) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!isVisible || !target || started.current) return;
    started.current = true;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isVisible, target, duration]);

  return count;
}

function StatCard({ stat, index, isVisible }) {
  const IconComponent = STAT_ICON_MAP[stat.label];
  const count = useCountUp(
    typeof stat.value === 'number' ? stat.value : null,
    1800 + index * 200,
    isVisible
  );

  return (
    <div className={`stat-card reveal reveal--scale reveal--delay-${index + 1}`} role="article">
      <div className="stat-card__icon-wrap" aria-hidden="true">
        {IconComponent && <IconComponent size={22} className="stat-card__icon" />}
      </div>
      <div className="stat-card__value">
        {typeof stat.value === 'number' ? count.toLocaleString() : stat.display}
        {typeof stat.value === 'number' && stat.suffix && (
          <span className="stat-card__suffix">{stat.suffix}</span>
        )}
      </div>
      <div className="stat-card__label">{stat.label}</div>
    </div>
  );
}

export default function Stats() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setIsVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="stats section" id="stats" ref={sectionRef} aria-labelledby="stats-heading">
      <div className="stats__bg" aria-hidden="true" />
      <div className="container">
        <div className="stats__header">
          <p className="section-label reveal">Momentum & Scale</p>
          <h2 id="stats-heading" className="reveal reveal--delay-1">
            <span className="gradient-text-gold">Growing</span> Every Day
          </h2>
          <p className="stats__subtitle reveal reveal--delay-2">
            A committed technology team engineering scalable architectures and building momentum across domains.
          </p>
        </div>
        <div className="stats__grid" role="list">
          {STATS.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
    </section>
  );
}
