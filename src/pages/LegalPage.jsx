import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { ShieldIcon, ArrowRightIcon, CheckIcon } from '../components/icons';
import { updatePageMeta } from '../utils/seo';
import './LegalPage.css';

const TABS = [
  { id: 'privacy', label: 'Privacy Policy', path: '/privacy-policy' },
  { id: 'terms', label: 'Terms of Service', path: '/terms-of-service' },
  { id: 'security', label: 'Security Statement', path: '/security' },
];

export default function LegalPage({ initialTab = 'privacy' }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    window.scrollTo(0, 0);
    const pathname = location.pathname.toLowerCase();
    if (pathname.includes('terms')) {
      setActiveTab('terms');
    } else if (pathname.includes('security')) {
      setActiveTab('security');
    } else {
      setActiveTab('privacy');
    }
  }, [location.pathname]);

  useEffect(() => {
    const titles = {
      privacy: 'Privacy Policy | Ashivam Technologies',
      terms: 'Terms of Service | Ashivam Technologies',
      security: 'Enterprise Security Architecture | Ashivam Technologies',
    };
    const descriptions = {
      privacy: 'Official Privacy Policy of Ashivam Technologies. Learn how we handle enterprise data, inquiries, confidentiality, and user rights.',
      terms: 'Terms of Service governing engineering consulting, intellectual property, project delivery, and SLAs at Ashivam Technologies.',
      security: 'Enterprise security standards, infrastructure encryption, database parameterization, and vulnerability disclosure protocols.',
    };
    updatePageMeta({
      title: titles[activeTab] || titles.privacy,
      description: descriptions[activeTab] || descriptions.privacy,
      canonical: `https://ashivam-tec-h.vercel.app/${activeTab === 'privacy' ? 'privacy-policy' : activeTab === 'terms' ? 'terms-of-service' : 'security'}`,
    });
  }, [activeTab]);

  return (
    <div className="legal-page">
      <Navbar />

      <main className="legal-main" id="main-content">
        <section className="legal-hero">
          <div className="container">
            <div className="legal-hero__content">
              <span className="legal-hero__badge">
                <ShieldIcon size={14} />
                <span>Enterprise Governance & Compliance</span>
              </span>
              <h1 className="legal-hero__title">
                Trust, Transparency &{' '}
                <span className="gradient-text-gold">Engineering Integrity</span>
              </h1>
              <p className="legal-hero__desc">
                Clear terms, strict data custody, and institutional security practices protecting every client engagement and application build.
              </p>

              {/* Navigation Tabs */}
              <div className="legal-tabs" role="tablist" aria-label="Legal policies and documentation">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`legal-tab__btn${activeTab === tab.id ? ' legal-tab__btn--active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="legal-content-section">
          <div className="container">
            <div className="legal-card">
              <div className="legal-card__header">
                <span className="legal-card__meta">Effective: October 2026 • Version 2.4</span>
                <span className="legal-card__status">
                  <span className="legal-card__status-dot" aria-hidden="true" />
                  Active Policy
                </span>
              </div>

              {/* PRIVACY POLICY */}
              {activeTab === 'privacy' && (
                <div className="legal-document">
                  <h2>Ashivam Technologies Privacy Policy</h2>
                  <p className="legal-lead">
                    Ashivam Technologies (&ldquo;Ashivam&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to respecting and protecting the privacy, confidentiality, and data sovereignty of our clients, website visitors, job applicants, and enterprise partners.
                  </p>

                  <div className="legal-block">
                    <h3>1. Data We Collect</h3>
                    <p>We collect information solely to provide enterprise software engineering services, assess project feasibility, and evaluate recruitment candidates:</p>
                    <ul className="legal-list">
                      <li><strong>Direct Inquiries:</strong> Full name, corporate email address, contact phone/WhatsApp number, organization name, and technical project briefs submitted via our contact portal.</li>
                      <li><strong>Career Submissions:</strong> Resumes, employment history, portfolios, and professional references provided through our recruitment gateway.</li>
                      <li><strong>Technical Observability:</strong> Anonymized interaction telemetry, device classifications, and standard HTTP server logs (IP address, user-agent) used to diagnose infrastructure performance.</li>
                    </ul>
                  </div>

                  <div className="legal-block">
                    <h3>2. Absolute Zero-Sale Data Commitment</h3>
                    <p>
                      <strong>We never sell, rent, monetize, or broker personal or corporate information to third-party advertisers, data aggregators, or unauthorized third parties.</strong> Data submitted through this website is strictly utilized to conduct engineering assessments, fulfill contracts, and maintain operational communications.
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>3. Data Custody & Storage</h3>
                    <p>
                      All submissions are transmitted over encrypted TLS channels. Inquiries and candidate records are stored in managed database clusters with network firewall isolation, authentication protection, and role-based access control (RBAC).
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>4. Your Privacy Rights</h3>
                    <p>Depending on your jurisdiction, you retain statutory rights over your personal data:</p>
                    <ul className="legal-list">
                      <li>The right to request access to the personal records we retain concerning your account.</li>
                      <li>The right to request correction or rectification of outdated records.</li>
                      <li>The right to request permanent erasure of your inquiry or candidate data from our databases.</li>
                      <li>The right to withdraw processing consent at any moment without prejudice.</li>
                    </ul>
                  </div>

                  <div className="legal-block">
                    <h3>5. Privacy Inquiries & Contact</h3>
                    <p>
                      For any questions regarding our data practices or to request data updates/deletion, contact our privacy team at:
                    </p>
                    <div className="legal-contact-callout">
                      <strong>Privacy & Compliance Inquiries:</strong>{' '}
                      <a href="mailto:team.ashivam@gmail.com">team.ashivam@gmail.com</a>
                      <br />
                      <span>Ashivam Technologies • Agra, Uttar Pradesh, India</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TERMS OF SERVICE */}
              {activeTab === 'terms' && (
                <div className="legal-document">
                  <h2>Terms of Service & Engineering Governance</h2>
                  <p className="legal-lead">
                    These Terms of Service govern your access to the Ashivam Technologies website, technical evaluations, consulting engagements, and bespoke software development contracts.
                  </p>

                  <div className="legal-block">
                    <h3>1. Professional Engineering Engagements</h3>
                    <p>
                      All custom software engineering, API development, mobile applications, and enterprise architecture contracts are governed by an executed Master Services Agreement (MSA) and project-specific Statements of Work (SOW). Project specifications, acceptance criteria, milestone timelines, and billing milestones are formally agreed upon prior to code execution.
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>2. 100% Client Intellectual Property (IP) Ownership</h3>
                    <p>
                      Upon full settlement of milestone invoices specified in the applicable Statement of Work, <strong>all custom code, repository commits, database schemas, and proprietary architectural documentation created for the client are 100% the sole property of the client.</strong> Ashivam assigns all worldwide copyright and intellectual property rights in bespoke deliverables upon final payment.
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>3. Non-Disclosure & Confidentiality</h3>
                    <p>
                      Ashivam operates under strict mutual confidentiality protocols. All client project briefs, architectural schematics, proprietary logic, and trade secrets shared during discovery or development are protected by binding non-disclosure obligations.
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>4. Quality & Warranty Commitments</h3>
                    <p>
                      Software deliverables undergo multi-stage automated regression testing, security auditing, and code reviews. We provide dedicated warranty support periods following production release to resolve verified functional defects without additional charge.
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>5. Governing Law & Dispute Resolution</h3>
                    <p>
                      These terms and all commercial agreements are construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in Agra, Uttar Pradesh, India.
                    </p>
                  </div>
                </div>
              )}

              {/* SECURITY PROTOCOL */}
              {activeTab === 'security' && (
                <div className="legal-document">
                  <h2>Enterprise Security Standards & Architecture</h2>
                  <p className="legal-lead">
                    Security is not an afterthought at Ashivam Technologies; it is engineered into our foundation. We practice continuous defense-in-depth across our application code, API gateways, database persistence layers, and infrastructure.
                  </p>

                  <div className="legal-block">
                    <h3>1. Application & API Hardening</h3>
                    <ul className="legal-list">
                      <li><strong>Parameterized Inputs:</strong> All backend endpoints enforce strict payload validation, data sanitization, and parameterized database queries to eliminate SQL/NoSQL injection risks.</li>
                      <li><strong>Cryptographic Session Tokens:</strong> Authenticated sessions utilize signed JSON Web Tokens (JWT) with secure HTTP-only cookies and cryptographic expiry.</li>
                      <li><strong>Automated Rate Limiting:</strong> Multi-tiered rate limiters guard against brute-force attacks, DDoS attempts, and abusive scraping.</li>
                      <li><strong>Honeypot Bot Defense:</strong> Public inquiry portals embed silent honeypot validations and origin verifications to reject automated spam.</li>
                    </ul>
                  </div>

                  <div className="legal-block">
                    <h3>2. Encryption in Transit & Cloud Infrastructure</h3>
                    <p>
                      All production network traffic is served over encrypted TLS channels with security headers managed by our hosting platform. Database records and backups are maintained in managed cloud environments with isolated access controls.
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>3. Continuous Automated Testing & Auditing</h3>
                    <p>
                      Our CI/CD pipelines run automated dependency vulnerability audits (npm audit) and regression test suites on pull requests prior to merging into production branches.
                    </p>
                  </div>

                  <div className="legal-block">
                    <h3>4. Vulnerability Disclosure Program</h3>
                    <p>
                      We welcome responsible security research. If you believe you have discovered a security vulnerability within our public website or digital infrastructure, please notify us immediately:
                    </p>
                    <div className="legal-contact-callout">
                      <strong>Security Response Team:</strong>{' '}
                      <a href="mailto:team.ashivam@gmail.com">team.ashivam@gmail.com</a>
                      <br />
                      <span>PGP Key / Encrypted communications available upon request. We commit to acknowledging reports within 24 business hours.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Banner */}
              <div className="legal-card__footer">
                <div className="legal-footer__text">
                  <h4>Have questions about our enterprise compliance?</h4>
                  <p>Our engineering and legal leadership are available to discuss tailored MSAs, NDAs, or institutional audit requirements.</p>
                </div>
                <Link to="/contact" className="btn btn-primary legal-footer__btn">
                  <span>Contact Our Team</span>
                  <ArrowRightIcon size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
