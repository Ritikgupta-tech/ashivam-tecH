import { useEffect, useRef, useState } from 'react';

/**
 * Mouse Parallax Hook
 * Calculates normalized mouse coordinates (-1 to 1) relative to container or window.
 * @param {Object} options
 * @param {number} options.intensity - Movement intensity multiplier (default: 20)
 * @param {boolean} options.windowLevel - Whether to track global window or container (default: false)
 * @returns {{ containerRef: React.RefObject, x: number, y: number, style: Object }}
 */
export function useMouseParallax({ intensity = 20, windowLevel = false } = {}) {
  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let frameId;

    const handleMove = (e) => {
      let nx = 0;
      let ny = 0;

      if (windowLevel) {
        nx = (e.clientX / window.innerWidth - 0.5) * 2;
        ny = (e.clientY / window.innerHeight - 0.5) * 2;
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }

      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setCoords({
          x: nx * intensity,
          y: ny * intensity,
        });
      });
    };

    const target = windowLevel ? window : containerRef.current;
    if (!target) return;

    target.addEventListener('mousemove', handleMove);
    return () => {
      cancelAnimationFrame(frameId);
      target.removeEventListener('mousemove', handleMove);
    };
  }, [intensity, windowLevel]);

  return {
    containerRef,
    x: coords.x,
    y: coords.y,
    style: {
      transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
      transition: 'transform 0.1s ease-out',
    },
  };
}

export default useMouseParallax;
