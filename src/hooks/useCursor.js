import { useEffect, useRef } from 'react';

/**
 * Custom cursor hook — creates a dot + ring cursor for desktop.
 * Automatically disabled on touch devices.
 */
export function useCustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    // Only on non-touch desktop
    if (window.matchMedia('(hover: none)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    dot.style.display = 'block';
    ring.style.display = 'block';

    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    const animate = () => {
      // Dot follows instantly
      dot.style.transform = `translate(${posRef.current.x - 4}px, ${posRef.current.y - 4}px)`;

      // Ring lags behind
      ringPosRef.current.x = lerp(ringPosRef.current.x, posRef.current.x, 0.12);
      ringPosRef.current.y = lerp(ringPosRef.current.y, posRef.current.y, 0.12);
      ring.style.transform = `translate(${ringPosRef.current.x - 20}px, ${ringPosRef.current.y - 20}px)`;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    window.addEventListener('mousemove', onMove);

    const handleOver = (e) => {
      const target = e.target;
      if (target.closest('a, button, input, select, textarea, [role="button"], [data-cursor], .service-card, .solution-card, .project-card, .team-card, .career-item, .contact-info-card')) {
        ring.classList.add('cursor-ring--active');
      } else {
        ring.classList.remove('cursor-ring--active');
      }
    };

    window.addEventListener('mouseover', handleOver);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', handleOver);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { dotRef, ringRef };
}

/**
 * Mouse parallax — returns x/y offsets for hero parallax effect.
 */
export function useMouseParallax(strength = 0.02) {
  const ref = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      ref.current = {
        x: (e.clientX - cx) * strength,
        y: (e.clientY - cy) * strength,
      };
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [strength]);

  return ref;
}
