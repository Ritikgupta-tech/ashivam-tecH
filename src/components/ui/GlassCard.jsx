import { useRef } from 'react';
import './GlassCard.css';

export default function GlassCard({
  children,
  className = '',
  spotlight = false,
  glowColor = 'rgba(197, 155, 39, 0.12)',
  accent = 'gold', // 'gold' | 'neutral' | 'blue' | 'cyan' (legacy mapped to gold)
  tilt = false,
  ...props
}) {
  const cardRef = useRef(null);
  const normalizedAccent = accent === 'cyan' ? 'gold' : accent;

  const handleMouseMove = (e) => {
    if (!spotlight && !tilt) return;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (spotlight) {
      card.style.setProperty('--spot-x', `${x}px`);
      card.style.setProperty('--spot-y', `${y}px`);
    }

    if (tilt) {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -4;
      const ry = ((x - cx) / cx) * 4;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    }
  };

  const handleMouseLeave = () => {
    if (tilt && cardRef.current) {
      cardRef.current.style.transform = '';
    }
  };

  return (
    <div
      ref={cardRef}
      className={`glass-card glass-card--accent-${normalizedAccent} ${spotlight ? 'glass-card--spotlight' : ''} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ '--glow-color': glowColor }}
      {...props}
    >
      {spotlight && <div className="glass-card__spotlight" aria-hidden="true" />}
      <div className="glass-card__content">{children}</div>
    </div>
  );
}
