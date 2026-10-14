import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { trackPageView } from '../utils/analytics';

/**
 * RouteScrollWatcher:
 * 1. Resets scroll position on route transitions unless navigating to a hash anchor.
 * 2. Initializes and triggers scroll reveal animations across all pages.
 * 3. Tracks route page views with de-duplication against React re-renders.
 */
export default function RouteScrollWatcher() {
  const location = useLocation();
  const lastTracked = useRef('');
  useScrollReveal();

  useEffect(() => {
    if (lastTracked.current !== location.pathname) {
      lastTracked.current = location.pathname;
      trackPageView(location.pathname);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return null;
}
