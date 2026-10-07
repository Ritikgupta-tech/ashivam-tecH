import { useState } from 'react';
import { COMPANY, NAV_LINKS, SERVICES } from '../../data/content';
import { CheckIcon, ArrowRightIcon } from '../icons';
import Logo from '../ui/Logo';
import './Footer.css';

export default function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(newsletterEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubscribed(true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (href) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer" id="footer" aria-label="Site footer">
      <div className="footer__glow" aria-hidden="true" />
      <div className="footer__grid-pattern" aria-hidden="true" />

      <div className="container">
        {/* Top Newsletter & Insights Banner */}
        <div className="footer__newsletter-card reveal">
          <div className="footer__newsletter-content">
            <h3 className="footer__newsletter-title">
              Stay ahead with <span className="gradient-text-gold">Ashivam Tech Insights</span>
            </h3>
            <p className="footer__newsletter-desc">
              Subscribe for periodic product updates, engineering articles, and enterprise architecture breakthroughs.
            </p>
          </div>

          <div className="footer__newsletter-action">
            {subscribed ? (
              <div className="footer__newsletter-success" role="status">
                <span className="footer__newsletter-check">
                  <CheckIcon size={14} />
                </span>
                <span>You're on the list. Thank you for subscribing.</span>
              </div>
            ) : (
              <form className="footer__newsletter-form" onSubmit={handleSubscribe} noValidate>
                <div className="footer__input-wrap">
                  <input
                    type="email"
                    placeholder="Enter your business email"
                    value={newsletterEmail}
                    onChange={(e) => { setNewsletterEmail(e.target.value); setError(''); }}
                    className={`footer__input${error ? ' footer__input--error' : ''}`}
                    aria-label="Newsletter email address"
                  />
                  <button type="submit" className="footer__subscribe-btn" aria-label="Subscribe to newsletter">
                    <span>Subscribe</span>
                    <ArrowRightIcon size={14} />
                  </button>
                </div>
                {error && <span className="footer__error-msg">{error}</span>}
              </form>
            )}
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="footer__main">
          {/* Brand Info */}
          <div className="footer__brand-col">
            <a href="#home" className="footer__logo-link" onClick={(e) => { e.preventDefault(); scrollToTop(); }}>
              <Logo size={40} showText={true} />
            </a>
            <p className="footer__tagline">{COMPANY.tagline}</p>
            <p className="footer__description">{COMPANY.description}</p>
            
            {/* Status Pill */}
            <div className="footer__status-badge" title="Service operational status">
              <span className="footer__status-dot" aria-hidden="true" />
              <span className="footer__status-text">All Systems Operational</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__col">
            <h4 className="footer__col-title">Navigation</h4>
            <ul className="footer__links">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="footer__link"
                    onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="footer__col">
            <h4 className="footer__col-title">Engineering</h4>
            <ul className="footer__links">
              {SERVICES.map((s) => (
                <li key={s.id}>
                  <a
                    href="#services"
                    className="footer__link"
                    onClick={(e) => { e.preventDefault(); handleNavClick('#services'); }}
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect / Location */}
          <div className="footer__col">
            <h4 className="footer__col-title">Headquarters</h4>
            <p className="footer__contact-info">
              <span>Location:</span> Agra, Uttar Pradesh, India
            </p>
            <p className="footer__contact-info">
              <span>Email:</span>{' '}
              <a href={`mailto:${COMPANY.email}`} className="footer__contact-link">
                {COMPANY.email}
              </a>
            </p>

            <div className="footer__socials" aria-label="Social media channels">
              <a
                href={COMPANY.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-btn"
                aria-label="Ashivam Technologies on LinkedIn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a
                href={COMPANY.github}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-btn"
                aria-label="Ashivam Technologies on GitHub"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href={`mailto:${COMPANY.email}`}
                className="footer__social-btn"
                aria-label="Email Ashivam Technologies"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer__bottom">
          <div className="footer__copyright">
            {COMPANY.copyright} • Agra, India
          </div>

          <div className="footer__legal">
            <a href="#about" className="footer__legal-link">Privacy Policy</a>
            <span className="footer__legal-sep">·</span>
            <a href="#about" className="footer__legal-link">Terms of Service</a>
            <span className="footer__legal-sep">·</span>
            <a href="#about" className="footer__legal-link">Security</a>
          </div>

          <button
            onClick={scrollToTop}
            className="footer__back-to-top"
            aria-label="Back to top of page"
          >
            <span>Back to Top</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
