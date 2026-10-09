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
import TechStack from '../components/TechStack/TechStack';
import Projects from '../components/Projects/Projects';
import WhyAshivam from '../components/WhyAshivam/WhyAshivam';
import Team from '../components/Team/Team';
import Careers from '../components/Careers/Careers';
import Culture from '../components/Culture/Culture';
import CTA from '../components/CTA/CTA';
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
        <main>
          <Hero />
          <About />
          <Stats />
          <Services />
          <Solutions />
          <TechStack />
          <Projects />
          <WhyAshivam />
          <Team />
          <Careers />
          <Culture />
          <CTA />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
