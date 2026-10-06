import { useEffect, useRef, useState } from 'react';
import { COMPANY } from '../../data/content';
import './Hero.css';

const FLOAT_CARDS = [
  { icon: '🌐', label: 'Web Development', delay: 0 },
  { icon: '🎨', label: 'UI/UX Design', delay: 0.5 },
  { icon: '☁️', label: 'Cloud & Backend', delay: 1 },
  { icon: '📱', label: 'Mobile Apps', delay: 1.5 },
];

const WORDS = ['Forward.', 'Reality.', 'Impact.', 'Tomorrow.'];

export default function Hero() {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const parallaxRef = useRef(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);
  const mousePos = useRef({ x: 0, y: 0 });

  // Word cycler
  useEffect(() => {
    const cycle = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % WORDS.length);
        setWordVisible(true);
      }, 400);
    }, 2500);
    return () => clearInterval(cycle);
  }, []);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        });
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Mouse parallax
  useEffect(() => {
    const handleMove = (e) => {
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      mousePos.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate(${mousePos.current.x * -20}px, ${mousePos.current.y * -15}px)`;
      }
    };
    const el = heroRef.current;
    el?.addEventListener('mousemove', handleMove);
    return () => el?.removeEventListener('mousemove', handleMove);
  }, []);

  const scrollToNext = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCTA = (href) => {
    document.getElementById(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero" id="home" ref={heroRef} aria-labelledby="hero-heading">
      {/* Particle canvas */}
      <canvas className="hero__canvas" ref={canvasRef} aria-hidden="true" />

      {/* Background elements */}
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__orb hero__orb--1" />
        <div className="hero__orb hero__orb--2" />
        <div className="hero__orb hero__orb--3" />
        <div className="hero__grid" />
      </div>

      {/* Parallax layer */}
      <div className="hero__parallax" ref={parallaxRef} aria-hidden="true">
        {FLOAT_CARDS.map((card, i) => (
          <div
            key={card.label}
            className={`hero__float-card float-${(i % 4) + 1}`}
            style={{ animationDelay: `${card.delay}s` }}
            data-index={i}
          >
            <span className="hero__float-icon">{card.icon}</span>
            <span className="hero__float-label">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="hero__content container">
        {/* Badge */}
        <div className="hero__badge page-load-2" aria-label="Company identity">
          <span className="hero__badge-dot" />
          Innovation &nbsp;•&nbsp; Technology &nbsp;•&nbsp; Impact
        </div>

        {/* Headline */}
        <h1 id="hero-heading" className="hero__headline page-load-3">
          We Build Technology
          <br />
          That Moves Ideas{' '}
          <span className={`hero__word gradient-text${wordVisible ? ' hero__word--visible' : ''}`}>
            {WORDS[wordIndex]}
          </span>
        </h1>

        {/* Description */}
        <p className="hero__description page-load-4">
          {COMPANY.description}
        </p>

        {/* CTAs */}
        <div className="hero__ctas page-load-5">
          <button
            className="btn btn-primary hero__cta-primary"
            onClick={() => handleCTA('contact')}
            id="hero-cta-start"
          >
            Start a Project
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="btn btn-outline hero__cta-secondary"
            onClick={() => handleCTA('projects')}
            id="hero-cta-explore"
          >
            Explore Our Work
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Trust indicators */}
        <div className="hero__trust page-load-6">
          <div className="hero__trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--clr-primary)" aria-hidden="true">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--clr-primary)" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            Modern Tech Stack
          </div>
          <div className="hero__trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--clr-primary)" strokeWidth="2" aria-hidden="true">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" />
            </svg>
            Quality Driven
          </div>
          <div className="hero__trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--clr-primary)" strokeWidth="2" aria-hidden="true">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" />
            </svg>
            Future Ready
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        className="hero__scroll-indicator"
        onClick={scrollToNext}
        aria-label="Scroll to next section"
      >
        <div className="hero__scroll-wheel" />
        <span className="hero__scroll-text">Scroll</span>
      </button>
    </section>
  );
}
