import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldIcon, ArrowRightIcon } from '../icons';
import './Navbar.css';

const PRIMARY_NAV = [
  { label: 'Industries', path: '/industries' },
  { label: 'Solutions', path: '/solutions' },
  { label: 'Careers', path: '/careers' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const drawerRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname;

  // Track page scroll for background glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer upon route change
  useEffect(() => {
    setMenuOpen(false);
  }, [currentPath]);

  // Close menu on click outside header and drawer
  useEffect(() => {
    const handleClick = (e) => {
      if (
        menuOpen &&
        navRef.current &&
        !navRef.current.contains(e.target) &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Body scroll locking when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [menuOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header
        ref={navRef}
        className={`navbar${scrolled ? ' navbar--scrolled' : ''}${menuOpen ? ' navbar--open' : ''}`}
      >
        <div className="navbar__container">
          {/* Logo on Left -> Navigates to Homepage */}
          <Link
            to="/"
            className="navbar__logo"
            aria-label="Ashivam Technologies — Home"
          >
            <div className="navbar__logo-mark">
              <img
                src="/logo-symbol.png"
                alt="Ashivam Technologies Symbol"
                className="navbar__logo-img"
                width="44"
                height="25"
              />
            </div>
            <div className="navbar__logo-text">
              <span className="navbar__logo-name">Ashivam</span>
              <span className="navbar__logo-sub">Technologies</span>
            </div>
          </Link>

          {/* Primary Navigation: Exactly Industries, Solutions, Careers */}
          <nav className="navbar__nav" aria-label="Primary navigation">
            <ul className="navbar__links" role="menubar">
              {PRIMARY_NAV.map((item) => {
                const isActive =
                  currentPath === item.path ||
                  (item.path !== '/' && currentPath.startsWith(item.path));
                return (
                  <li key={item.path} role="none">
                    <Link
                      to={item.path}
                      className={`navbar__link${isActive ? ' navbar__link--active' : ''}`}
                      role="menuitem"
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right Header Actions: Distinct Employee Login Button & Mobile Toggle */}
          <div className="navbar__actions">
            <Link
              to="/employee-login"
              className={`navbar__employee-btn${
                currentPath.startsWith('/employee-login') ? ' navbar__employee-btn--active' : ''
              }`}
              aria-label="Employee & Administrative Login Gateway"
            >
              <ShieldIcon size={14} className="navbar__employee-icon" />
              <span>Employee Login</span>
            </Link>

            {/* Mobile & Tablet Hamburger Button */}
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
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        ref={drawerRef}
        className={`mobile-menu${menuOpen ? ' mobile-menu--open' : ''}`}
        aria-hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="mobile-menu__content">
          {/* Dedicated Drawer Top Bar */}
          <div className="mobile-menu__header">
            <Link
              to="/"
              className="mobile-menu__logo"
              onClick={() => setMenuOpen(false)}
              aria-label="Ashivam Technologies — Home"
            >
              <img
                src="/logo-symbol.png"
                alt="Ashivam Technologies"
                className="mobile-menu__logo-img"
                width="38"
                height="22"
              />
              <div className="mobile-menu__logo-text">
                <span className="mobile-menu__logo-name">Ashivam</span>
                <span className="mobile-menu__logo-sub">Technologies</span>
              </div>
            </Link>
            <button
              type="button"
              className="mobile-menu__close-btn"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          </div>

          <nav aria-label="Mobile navigation links" className="mobile-menu__nav">
            <ul className="mobile-menu__links">
              <li>
                <Link
                  to="/"
                  className={`mobile-menu__link${currentPath === '/' ? ' mobile-menu__link--active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Home</span>
                  <ArrowRightIcon size={14} className="mobile-menu__link-arrow" />
                </Link>
              </li>
              {PRIMARY_NAV.map((item) => {
                const isActive =
                  currentPath === item.path ||
                  (item.path !== '/' && currentPath.startsWith(item.path));
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`mobile-menu__link${isActive ? ' mobile-menu__link--active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span>{item.label}</span>
                      <ArrowRightIcon size={14} className="mobile-menu__link-arrow" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Prominent Employee Login Portal Link inside Mobile Drawer */}
          <div className="mobile-menu__footer-actions">
            <Link
              to="/employee-login"
              className="btn btn-primary mobile-menu__employee-btn"
              onClick={() => setMenuOpen(false)}
            >
              <ShieldIcon size={16} />
              <span>Employee Login</span>
              <ArrowRightIcon size={14} />
            </Link>
            <p className="mobile-menu__tagline">Ashivam Technologies • Enterprise Engineering</p>
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      <div
        className={`mobile-backdrop${menuOpen ? ' mobile-backdrop--visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
    </>
  );
}
