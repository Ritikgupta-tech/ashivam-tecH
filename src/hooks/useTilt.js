import { useRef, useEffect } from 'react';

/**
 * 3D Tilt Effect Hook
 * @param {Object} options - Configuration options
 * @param {number} options.max - Max tilt rotation angle in degrees (default: 10)
 * @param {number} options.perspective - Perspective depth in px (default: 1000)
 * @param {number} options.scale - Scale factor on hover (default: 1.02)
 * @param {number} options.speed - Transition speed in ms (default: 300)
 * @returns {React.RefObject} ref to attach to element
 */
export function useTilt(options = {}) {
  const ref = useRef(null);
  const {
    max = 10,
    perspective = 1000,
    scale = 1.02,
    speed = 300,
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frameId;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotX = ((y - cy) / cy) * -max;
      const rotY = ((x - cx) / cx) * max;

      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        el.style.transform = `perspective(${perspective}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      });
    };

    const handleMouseEnter = () => {
      el.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(frameId);
      el.style.transition = `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`;
      el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(frameId);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [max, perspective, scale, speed]);

  return ref;
}

export default useTilt;
