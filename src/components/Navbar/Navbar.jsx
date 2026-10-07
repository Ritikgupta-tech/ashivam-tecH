import { useState, useEffect, useRef } from 'react';
import { NAV_LINKS, COMPANY } from '../../data/content';
import { ArrowRightIcon } from '../icons';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);

      // Active section detection
      const sections = NAV_LINKS.map((l) => l.href.replace('#', ''));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 140) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuOpen && navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Prevent background scrolling when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleNavClick = (href) => {
    setMenuOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav
        ref={navRef}
        className={`navbar${scrolled ? ' navbar--scrolled' : ''}${menuOpen ? ' navbar--open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="navbar__container">
          {/* Logo on Left */}
          <a
            href="#home"
            className="navbar__logo"
            onClick={(e) => { e.preventDefault(); handleNavClick('#home'); }}
            aria-label="Ashivam Technologies - Return to home"
          >
            <div className="navbar__logo-mark">
              <img src="/logo.svg" alt="" className="navbar__logo-img" />
            </div>
            <div className="navbar__logo-text">
              <span className="navbar__logo-name">Ashivam</span>
              <span className="navbar__logo-sub">Technologies</span>
            </div>
          </a>

          {/* Centered/Right Desktop Navigation */}
          <ul className="navbar__links" role="menubar">
            {NAV_LINKS.map((link) => {
              const secId = link.href.replace('#', '');
              const isActive = activeSection === secId;
              return (
                <li key={link.href} role="none">
                  <a
                    href={link.href}
                    className={`navbar__link${isActive ? ' navbar__link--active' : ''}`}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  >
                    <span>{link.label}</span>
                    <span className="navbar__link-underline" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>

          {/* CTA on Far Right */}
          <a
            href="#contact"
            className="navbar__cta btn btn-primary"
            onClick={(e) => { e.preventDefault(); handleNavClick('#contact'); }}
          >
            <span>Let's Build Together</span>
            <ArrowRightIcon size={15} className="navbar__cta-arrow" />
          </a>

          {/* Hamburger (Mobile) */}
          <button
            className={`navbar__hamburger${menuOpen ? ' navbar__hamburger--open' : ''}`}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="navbar__ham-line" />
            <span className="navbar__ham-line" />
            <span className="navbar__ham-line" />
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <div
        className={`mobile-menu${menuOpen ? ' mobile-menu--open' : ''}`}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="mobile-menu__content">
          <div className="mobile-menu__logo">
            <img src="/logo.svg" alt="" className="mobile-menu__logo-img" />
            <div>
              <div className="mobile-menu__logo-name">Ashivam</div>
              <div className="mobile-menu__logo-sub">Technologies</div>
            </div>
          </div>

          <ul className="mobile-menu__links">
            {NAV_LINKS.map((link) => {
              const secId = link.href.replace('#', '');
              const isActive = activeSection === secId;
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`mobile-menu__link${isActive ? ' mobile-menu__link--active' : ''}`}
                    onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  >
                    <span>{link.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>

          <a
            href="#contact"
            className="btn btn-primary mobile-menu__cta"
            onClick={(e) => { e.preventDefault(); handleNavClick('#contact'); }}
          >
            <span>Let's Build Together</span>
            <ArrowRightIcon size={16} />
          </a>

          <p className="mobile-menu__tagline">Headquarters: Agra, Uttar Pradesh, India</p>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`mobile-backdrop${menuOpen ? ' mobile-backdrop--visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
    </>
  );
}
