import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';

/**
 * RouteScrollWatcher:
 * 1. Resets scroll position on route transitions unless navigating to a hash anchor.
 * 2. Initializes and triggers scroll reveal animations across all pages.
 */
export default function RouteScrollWatcher() {
  const location = useLocation();
  useScrollReveal();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  return null;
}
