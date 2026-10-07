import { useEffect, useRef, useState } from 'react';
import { COMPANY } from '../../data/content';
import { WebIcon, DesignIcon, ApiIcon, MobileIcon, ArrowRightIcon } from '../icons';
import './Hero.css';

const TECH_BADGES = [
  { label: 'Web Platforms', Icon: WebIcon, delay: 0 },
  { label: 'UI/UX Architecture', Icon: DesignIcon, delay: 0.5 },
  { label: 'Cloud & Microservices', Icon: ApiIcon, delay: 1 },
  { label: 'Native & Hybrid Mobile', Icon: MobileIcon, delay: 1.5 },
];

export default function Hero() {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const parallaxRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // Subtle ambient particle canvas (restrained, tech studio style)
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

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        opacity: Math.random() * 0.4 + 0.1,
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
        ctx.fillStyle = `rgba(197, 155, 39, ${p.opacity * 0.8})`;
        ctx.fill();
      });

      // Subtle particle connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(197, 155, 39, ${0.045 * (1 - dist / 110)})`;
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

  // Soft mouse parallax for depth
  useEffect(() => {
    const handleMove = (e) => {
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      mousePos.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate(${mousePos.current.x * -16}px, ${mousePos.current.y * -12}px)`;
      }
    };
    const el = heroRef.current;
    el?.addEventListener('mousemove', handleMove);
    return () => el?.removeEventListener('mousemove', handleMove);
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero" id="home" ref={heroRef} aria-labelledby="hero-heading">
      {/* Interactive particle canvas */}
      <canvas className="hero__canvas" ref={canvasRef} aria-hidden="true" />

      {/* Background Lighting & Grid Geometry */}
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__orb hero__orb--gold" />
        <div className="hero__orb hero__orb--ambient" />
        <div className="hero__grid" />
        <div className="hero__radial-glow" />
      </div>

      {/* Floating Architecture Depth Cards */}
      <div className="hero__parallax" ref={parallaxRef} aria-hidden="true">
        {TECH_BADGES.map((b, i) => {
          const IconComp = b.Icon;
          return (
            <div
              key={b.label}
              className={`hero__float-card float-${(i % 4) + 1}`}
              style={{ animationDelay: `${b.delay}s` }}
            >
              <span className="hero__float-icon">
                <IconComp size={16} />
              </span>
              <span className="hero__float-label">{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="hero__content container">
        {/* Gold Eyebrow */}
        <div className="hero__eyebrow page-load-2">
          <span className="hero__eyebrow-line" aria-hidden="true" />
          <span className="hero__eyebrow-text">ASHIVAM TECHNOLOGIES</span>
          <span className="hero__eyebrow-pill">AGRA • INDIA</span>
        </div>

        {/* Large Headline */}
        <h1 id="hero-heading" className="hero__headline page-load-3">
          Infinite Possibilities.
          <br />
          <span className="gradient-text-gold">Engineered with Precision.</span>
        </h1>

        {/* Supporting Text */}
        <p className="hero__description page-load-4">
          We are a modern technology and software engineering company crafting scalable digital products,
          enterprise architectures, and innovative platforms that move ideas into reality.
        </p>

        {/* CTAs */}
        <div className="hero__ctas page-load-5">
          <button
            className="btn btn-primary hero__cta-primary"
            onClick={() => scrollToSection('contact')}
            id="hero-cta-start"
          >
            Let's Build Together
            <ArrowRightIcon size={16} className="hero__btn-arrow" />
          </button>
          <button
            className="btn btn-outline hero__cta-secondary"
            onClick={() => scrollToSection('projects')}
            id="hero-cta-explore"
          >
            Explore Our Work
          </button>
        </div>

        {/* Trust Badges */}
        <div className="hero__trust page-load-6">
          <div className="hero__trust-item">
            <span className="hero__trust-dot" aria-hidden="true" />
            <span>Modern Tech Stack</span>
          </div>
          <div className="hero__trust-item">
            <span className="hero__trust-dot" aria-hidden="true" />
            <span>Clean Architecture</span>
          </div>
          <div className="hero__trust-item">
            <span className="hero__trust-dot" aria-hidden="true" />
            <span>Future Ready Engineering</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        className="hero__scroll-indicator"
        onClick={() => scrollToSection('about')}
        aria-label="Scroll to about section"
      >
        <div className="hero__scroll-wheel" />
        <span className="hero__scroll-text">Scroll</span>
      </button>
    </section>
  );
}
