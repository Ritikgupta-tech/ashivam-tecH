import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useCustomCursor } from '../hooks/useCursor';
import Navbar from '../components/Navbar/Navbar';
import Hero from '../components/Hero/Hero';
import About from '../components/About/About';
import Stats from '../components/Stats/Stats';
import Services from '../components/Services/Services';
import Solutions from '../components/Solutions/Solutions';
import WhyAshivam from '../components/WhyAshivam/WhyAshivam';
import CareersTeaser from '../components/CareersTeaser/CareersTeaser';
import Contact from '../components/Contact/Contact';
import Footer from '../components/Footer/Footer';
import '../App.css';

export default function HomePage() {
  useScrollReveal();
  const { dotRef, ringRef } = useCustomCursor();
  const location = useLocation();

  useEffect(() => {
    const sectionName = location.pathname.replace(/^\//, '').toLowerCase();
    if (sectionName) {
      const el = document.getElementById(sectionName);
      if (el) {
        const timer = setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location.pathname]);

  return (
    <>
      {/* Custom Cursor (desktop only) */}
      <div className="cursor-dot" ref={dotRef} aria-hidden="true" />
      <div className="cursor-ring" ref={ringRef} aria-hidden="true" />

      {/* Persistent background */}
      <div className="page-bg" aria-hidden="true" />

      {/* App */}
      <div className="app">
        <Navbar />
        <main id="main-content">
          <Hero />
          <About />
          <Stats />
          <Services />
          <Solutions />
          <WhyAshivam />
          <CareersTeaser />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
