import { useEffect, useRef } from 'react';

/**
 * Triggers scroll reveal animations using Intersection Observer.
 * Adds 'is-visible' class to elements with 'reveal' class when they enter viewport.
 */
export function useScrollReveal(options = {}) {
  const { threshold = 0.08, rootMargin = '0px 0px 80px 0px' } = options;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Enable reveal animation mode
    document.documentElement.classList.add('has-scroll-reveal');

    const updateVisibility = () => {
      const elements = document.querySelectorAll('.reveal:not(.is-visible)');
      if (elements.length === 0) return;

      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Immediately reveal if within or above viewport
        if (rect.top <= windowHeight + 120 && rect.bottom >= -50) {
          el.classList.add('is-visible');
        }
      });
    };

    // Run immediate check for elements in initial view
    updateVisibility();

    if (!('IntersectionObserver' in window)) {
      // Fallback for environments without IntersectionObserver
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    const observePending = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => {
        observer.observe(el);
      });
    };

    observePending();

    // Safety fallback: ensure no element remains invisible due to delayed render or observer mismatch
    const fallbackTimer = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    }, 400);

    // Watch for dynamically added DOM elements (tab filters, async jobs, etc.)
    const mutationObserver = new MutationObserver(() => {
      observePending();
      updateVisibility();
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [threshold, rootMargin]);
}

/**
 * Returns a ref and attaches Intersection Observer to trigger reveal.
 */
export function useRevealRef(options = {}) {
  const ref = useRef(null);
  const { threshold = 0.1, once = true } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          if (once) observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return ref;
}
