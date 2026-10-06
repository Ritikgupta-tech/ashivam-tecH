import { useState, useEffect, useRef } from 'react';
import { NAV_LINKS, COMPANY } from '../../data/content';
import './Navbar.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);

      // Active section detection
      const sections = NAV_LINKS.map((l) => l.href.replace('#', ''));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && el.getBoundingClientRect().top <= 120) {
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

  // Prevent body scroll when menu open
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
          {/* Logo */}
          <a
            href="#home"
            className="navbar__logo"
            onClick={(e) => { e.preventDefault(); handleNavClick('#home'); }}
            aria-label="Ashivam Technologies - Home"
          >
            <div className="navbar__logo-mark">
              <img src="/logo.svg" alt="Ashivam Technologies Logo" className="navbar__logo-img" />
            </div>
            <div className="navbar__logo-text">
              <span className="navbar__logo-name">Ashivam</span>
              <span className="navbar__logo-sub">Technologies</span>
            </div>
          </a>

          {/* Desktop Nav */}
          <ul className="navbar__links" role="menubar">
            {NAV_LINKS.map((link) => (
              <li key={link.href} role="none">
                <a
                  href={link.href}
                  className={`navbar__link${activeSection === link.href.replace('#', '') ? ' navbar__link--active' : ''}`}
                  role="menuitem"
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                >
                  {link.label}
                  <span className="navbar__link-underline" />
                </a>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href="#contact"
            className="navbar__cta btn btn-primary"
            onClick={(e) => { e.preventDefault(); handleNavClick('#contact'); }}
          >
            Let's Build Together
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>

          {/* Hamburger */}
          <button
            className={`navbar__hamburger${menuOpen ? ' navbar__hamburger--open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="navbar__ham-line" />
            <span className="navbar__ham-line" />
            <span className="navbar__ham-line" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div
        className={`mobile-menu${menuOpen ? ' mobile-menu--open' : ''}`}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="mobile-menu__content">
          <div className="mobile-menu__logo">
            <img src="/logo.png" alt="" className="mobile-menu__logo-img" />
            <div>
              <div className="mobile-menu__logo-name">Ashivam</div>
              <div className="mobile-menu__logo-sub">Technologies</div>
            </div>
          </div>
          <ul className="mobile-menu__links">
            {NAV_LINKS.map((link, i) => (
              <li key={link.href} style={{ transitionDelay: `${i * 50}ms` }}>
                <a
                  href={link.href}
                  className="mobile-menu__link"
                  onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#contact"
            className="btn btn-primary mobile-menu__cta"
            onClick={(e) => { e.preventDefault(); handleNavClick('#contact'); }}
          >
            Let's Build Together
          </a>
          <p className="mobile-menu__tagline">{COMPANY.tagline}</p>
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
