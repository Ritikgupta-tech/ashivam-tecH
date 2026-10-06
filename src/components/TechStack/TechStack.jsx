import { useEffect, useRef } from 'react';
import { TECH_STACK } from '../../data/content';
import './TechStack.css';

export default function TechStack() {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let nodes = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      initNodes();
    };

    const initNodes = () => {
      const w = canvas.width;
      const h = canvas.height;
      const count = TECH_STACK.length;
      nodes = TECH_STACK.map((tech, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const radius = Math.min(w, h) * 0.33;
        return {
          ...tech,
          x: w / 2 + Math.cos(angle) * radius,
          y: h / 2 + Math.sin(angle) * radius,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          ox: w / 2 + Math.cos(angle) * radius,
          oy: h / 2 + Math.sin(angle) * radius,
          pulse: Math.random() * Math.PI * 2,
        };
      });
      nodesRef.current = nodes;
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = Date.now() / 1000;

      // Update node positions (gentle drift)
      nodes.forEach((n) => {
        n.pulse += 0.02;
        n.x = n.ox + Math.sin(n.pulse + n.ox) * 4;
        n.y = n.oy + Math.cos(n.pulse + n.oy) * 4;
      });

      // Draw connections
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach((b) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 280) {
            const alpha = (1 - dist / 280) * 0.12;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = 1;

            // Animated dash
            ctx.setLineDash([4, 8]);
            ctx.lineDashOffset = -t * 20;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      });

      // Draw nodes
      nodes.forEach((n) => {
        const pulse = (Math.sin(n.pulse * 2) + 1) / 2;

        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 36 + pulse * 8);
        grd.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, 36 + pulse * 8, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8, 15, 32, 0.9)';
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.2 + pulse * 0.15})`;
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();

        // Icon/emoji
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.icon, n.x, n.y - 6);

        // Name label
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = `rgba(148, 163, 184, ${0.7 + pulse * 0.3})`;
        ctx.fillText(n.name, n.x, n.y + 14);
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className="techstack section" id="techstack" aria-labelledby="techstack-heading">
      <div className="container">
        <div className="techstack__header">
          <p className="section-label reveal">Our Arsenal</p>
          <h2 id="techstack-heading" className="reveal reveal--delay-1">
            Technology <span className="gradient-text">Ecosystem</span>
          </h2>
          <p className="techstack__subtitle reveal reveal--delay-2">
            A carefully curated stack of modern technologies powering everything we build.
          </p>
        </div>

        <div className="techstack__visual reveal reveal--scale reveal--delay-2">
          <canvas
            ref={canvasRef}
            className="techstack__canvas"
            aria-label="Technology stack network visualization"
          />
        </div>

        {/* Tag cloud for screen readers / mobile */}
        <div className="techstack__tags" aria-label="Technologies we use">
          {TECH_STACK.map((t) => (
            <span key={t.name} className="techstack__tag">
              <span aria-hidden="true">{t.icon}</span> {t.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
