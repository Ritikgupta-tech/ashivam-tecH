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
import Process from '../components/Process/Process';
import CareersTeaser from '../components/CareersTeaser/CareersTeaser';
import Contact from '../components/Contact/Contact';
import Footer from '../components/Footer/Footer';
import { updatePageMeta } from '../utils/seo';
import '../App.css';

export default function HomePage() {
  useScrollReveal();
  const { dotRef, ringRef } = useCustomCursor();
  const location = useLocation();

  useEffect(() => {
    updatePageMeta({
      title: 'Ashivam Technologies — Endless Innovation. Limitless Possibilities.',
      description: 'Ashivam Technologies is an enterprise software engineering company building scalable web applications, native mobile apps, and robust cloud APIs.',
      canonical: 'https://ashivam-tec-h.vercel.app/',
    });

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
          <Process />
          <CareersTeaser />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
