import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { WebIcon, DesignIcon, ApiIcon, MobileIcon, ArrowRightIcon } from '../icons';
import { trackCtaClick } from '../../utils/analytics';
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

  // High-performance ambient particle canvas (DPR-scaled, visibility-aware, halo rendering)
  useEffect(() => {
    const canvas = canvasRef.current;
    const heroEl = heroRef.current;
    if (!canvas || !heroEl) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let isVisible = true;
    let isTabVisible = !document.hidden;
    let particles = [];
    let resizeTimer;

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const initParticles = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = heroEl.offsetWidth;
      const height = heroEl.offsetHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      const isMobile = width < 768;
      const count = isMobile ? 22 : 36;
      particles = [];

      for (let i = 0; i < count; i++) {
        const isGold = Math.random() > 0.35;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * (isMobile ? 1.0 : 1.3) + 1.2,
          vx: (Math.random() - 0.5) * (isMobile ? 0.16 : 0.22),
          vy: (Math.random() - 0.5) * (isMobile ? 0.16 : 0.22),
          baseOpacity: Math.random() * 0.35 + 0.32,
          pulseVal: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.012,
          isGold,
        });
      }
    };

    initParticles();

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(initParticles, 150);
    };
    window.addEventListener('resize', handleResize);

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && isVisible && !isReduced) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(animId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const draw = () => {
      if (!isVisible || !isTabVisible) return;

      const width = heroEl.offsetWidth;
      const height = heroEl.offsetHeight;
      const isMobile = width < 768;

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulseVal += p.pulseSpeed;
        const currentOpacity = Math.min(0.85, Math.max(0.25, p.baseOpacity + Math.sin(p.pulseVal) * 0.16));

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Faint outer halo (ultra-fast, zero GPU shadowBlur overhead)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold
          ? `rgba(212, 175, 55, ${currentOpacity * 0.18})`
          : `rgba(135, 206, 235, ${currentOpacity * 0.18})`;
        ctx.fill();

        // Core solid particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.isGold
          ? `rgba(180, 130, 20, ${currentOpacity})`
          : `rgba(27, 111, 160, ${currentOpacity * 0.9})`;
        ctx.fill();
      });

      // Subtle particle constellation filaments with bounding-box spatial culling
      if (!isMobile) {
        const maxDist = 95;
        const maxDistSq = maxDist * maxDist;
        ctx.lineWidth = 0.65;

        for (let i = 0; i < particles.length; i++) {
          const pi = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const pj = particles[j];
            const dx = pi.x - pj.x;
            if (dx > maxDist || dx < -maxDist) continue;
            const dy = pi.y - pj.y;
            if (dy > maxDist || dy < -maxDist) continue;

            const distSq = dx * dx + dy * dy;
            if (distSq < maxDistSq) {
              const alpha = 0.14 * (1 - Math.sqrt(distSq) / maxDist);
              ctx.strokeStyle = pi.isGold
                ? `rgba(180, 130, 20, ${alpha})`
                : `rgba(27, 111, 160, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(pi.x, pi.y);
              ctx.lineTo(pj.x, pj.y);
              ctx.stroke();
            }
          }
        }
      }

      if (!isReduced) {
        animId = requestAnimationFrame(draw);
      }
    };

    // Observer to pause canvas animation when Hero scrolls out of view
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && isTabVisible && !isReduced) {
          cancelAnimationFrame(animId);
          animId = requestAnimationFrame(draw);
        } else {
          cancelAnimationFrame(animId);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(heroEl);

    if (!isReduced) {
      animId = requestAnimationFrame(draw);
    } else {
      draw(); // Single static render for reduced motion
    }

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Soft mouse parallax for depth (desktop only)
  useEffect(() => {
    if (window.matchMedia('(hover: none) or (prefers-reduced-motion: reduce)').matches) return;

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
        {/* Large Headline */}
        <h1 id="hero-heading" className="hero__headline page-load-2">
          <span className="hero__headline-primary">Endless Innovation.</span>
          <br className="hero__headline-break" />
          <span className="hero__headline-accent gradient-text-gold">Limitless Possibilities.</span>
        </h1>

        {/* Supporting Text */}
        <p className="hero__description page-load-3">
          We are a modern technology and software engineering company crafting scalable digital products,
          enterprise architectures, and innovative platforms that move ideas into reality.
        </p>

        {/* CTAs: Primary to Contact Consultation, Secondary to Solutions Portfolio */}
        <div className="hero__ctas page-load-4">
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              trackCtaClick('Discuss Your Project', '#contact');
              scrollToSection('contact');
            }}
            className="btn btn-primary hero__cta-primary"
            id="hero-cta-contact"
          >
            <span>Discuss Your Project</span>
            <ArrowRightIcon size={16} className="hero__btn-arrow" />
          </a>
          <Link
            to="/solutions"
            onClick={() => trackCtaClick('Explore Solutions', '/solutions')}
            className="btn btn-outline hero__cta-secondary"
            id="hero-cta-solutions"
          >
            <span>Explore Solutions</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="hero__trust page-load-5">
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
