# Product Requirements Document (PRD) — Official Corporate Website

> **Product Name:** Ashivam Technologies Corporate Platform (`ashivam-corporate-web`)  
> **Production URL:** [https://ashivam-tec-h.vercel.app/](https://ashivam-tec-h.vercel.app/)  
> **Repository:** [https://github.com/Ritikgupta-tech/ashivam-tecH.git](https://github.com/Ritikgupta-tech/ashivam-tecH.git)  
> **Official Tagline:** *Endless Innovation. Limitless Possibilities.*  
> **Status:** Production Active / Hardened  
> **Lead Product Director:** UI/UX & Product Design Director  

---

## 1. Executive Summary & Vision

The Official Corporate Website is the premier digital flagship for Ashivam Technologies. It establishes company credibility, communicates technical capabilities across enterprise software engineering, AI/ML, cloud architecture, and cybersecurity, captures qualified sales and partnership leads, attracts top engineering talent, and fulfills statutory trust and governance disclosures.

---

## 2. Target Audience & Personas

1. **Enterprise Decision Makers (CTOs, VP Engineering, Product Heads):**
   - Seeking agile, high-capability software engineering partners for custom development, modernization, or AI integration.
   - Key Needs: Demonstrable technical authority, robust architecture, enterprise case studies, security certifications.
2. **Prospective Job Seekers & Senior Engineers:**
   - Evaluating Ashivam Technologies as an employer of choice.
   - Key Needs: Engineering culture, open technical roles, seamless application submission, company vision.
3. **Internship Applicants & Students:**
   - Inquiring about specialized technical cohorts and mentorship programs.
   - Key Needs: Track details, application deadlines, verification of company legitimacy.
4. **Compliance & Legal Auditors:**
   - Verifying statutory privacy, security standards, and terms of service under Indian law (IT Act 2000, DPDP Act 2023).

---

## 3. Information Architecture & Site Map

```
/ (Home)
├── /about (Mission, Leadership, Engineering Principles, Milestones)
├── /services (Full-Stack, Cloud Architecture, AI/ML, DevSecOps)
├── /solutions (Enterprise SaaS, FinTech, HealthTech, Supply Chain)
├── /industries (Financial Services, Healthcare, E-Commerce, Logistics)
├── /careers (Open Roles, Culture, Engineering Benefits, Resume Application)
├── /contact (Lead Intake, Global Inquiry Form, Office Locations)
├── /privacy-policy (Statutory Data Privacy & DPDP Compliance)
├── /terms-of-service (Service Engagement Agreement & Liability Disclosures)
├── /security (Application Security Architecture, Vulnerability Disclosure Policy)
├── /sla (Service Level Agreements & Incident Support Tiers)
└── /admin (Privileged Operations Console — Triage, CMS, Lead Management)
```

---

## 4. Functional Requirements

### 4.1 Corporate Brand & Capabilities Showcase
- **FR-WEB-01 (Dynamic Hero Section):** High-impact visual canvas with particle background animation (throttled to 30fps when idle or out of viewport; fully disabled when `prefers-reduced-motion: reduce` is detected).
- **FR-WEB-02 (Services Catalog):** Interactive service cards detailing technical competencies, architectural approaches, and deliverable artifacts.
- **FR-WEB-03 (Interactive Solutions Matrix):** Filterable solution showcases categorized by industry vertical.

### 4.2 Lead Intake & Inquiry Management
- **FR-WEB-04 (Contact & Inquiry Form):** Secure form collecting `fullName`, `email`, `phone`, `subject`, and `message`.
- **FR-WEB-05 (Anti-Spam Defenses):** Enforces hidden honeypot field (`_gotcha`), client-side sanitization, and IP/email rate limiting (maximum 5 submissions per hour per IP).
- **FR-WEB-06 (Automated Notification Outbox):** Asynchronously dispatches a branded confirmation email to the applicant and an urgent alert email to `ritik95061@gmail.com`.

### 4.3 Careers & Job Portal
- **FR-WEB-07 (Job Listings & Filtering):** Real-time active job openings filtered by department, experience level, and work arrangement (Remote / Hybrid / On-site).
- **FR-WEB-08 (Application & Resume Upload):** Accessible modal dialog with strict keyboard focus trapping, Escape key dismiss, and secure multipart file upload (PDF/DOCX, magic-byte validated, max 5MB).

### 4.4 Trust, Legal & Compliance Suite
- **FR-WEB-09 (Legal & Policy Pages):** Comprehensive, readable documentation for Privacy Policy, Terms of Service, Security Architecture, and SLA.
- **FR-WEB-10 (Cookie Consent Banner):** Non-intrusive consent banner conforming to DPDP Act 2023 with granular opt-in controls for analytics cookies.

---

## 5. Non-Functional Requirements & Performance Standards

### 5.1 Core Web Vitals & Performance Benchmarks
- **LCP (Largest Contentful Paint):** $\le 1.2\text{s}$ on desktop, $\le 2.2\text{s}$ on mobile 4G.
- **INP (Interaction to Next Paint):** $\le 100\text{ms}$.
- **CLS (Cumulative Layout Shift):** $\le 0.05$.
- **Lighthouse Scores:** Performance $\ge 95$, Accessibility $\ge 100$, Best Practices $\ge 98$, SEO $\ge 100$.

### 5.2 Accessibility Standards (WCAG 2.1 AA)
- **Contrast Ratios:** Minimum 4.5:1 for normal body text; minimum 3:1 for large headers and interface components.
- **Keyboard Navigation:** Full site navigable via Tab/Shift+Tab; visible high-contrast focus rings (`outline: 2px solid var(--accent-cyan)`).
- **Skip Links:** Primary `#main-content` skip link accessible on first Tab press.
- **Motion Reduction:** Media queries for `@media (prefers-reduced-motion: reduce)` disabling all decorative particle canvases, transitions, and pulsing badges.

### 5.3 SEO & Discoverability
- **Semantic HTML5:** Strict hierarchical headings (`h1` through `h6`).
- **Structured Data:** Schema.org `Organization`, `WebSite`, and `JobPosting` JSON-LD microdata embedded in `index.html` and dynamic route headers.
- **Metadata:** OpenGraph and Twitter Card meta tags with high-resolution brand preview assets (`/og-image.png`).
- **Sitemap & Robots:** Dynamically maintained `sitemap.xml` with verified canonical URLs and strict `robots.txt` disallowing `/admin/` and `/api/`.

---

## 6. Success Metrics & Key Performance Indicators (KPIs)

| Metric | Target | Measurement Tool |
| :--- | :--- | :--- |
| **Organic Search Growth** | +25% MoM | Google Search Console |
| **Inquiry Form Conversion Rate**| $\ge 3.5\%$ of unique visitors | PostHog / Google Analytics |
| **Careers Application Completion**| $\ge 65\%$ modal initiation to submission | Application Event Logs |
| **Accessibility Compliance** | Zero critical/serious axe-core violations | Automated CI axe / Playwright |
| **Uptime & Reliability** | $99.95\%$ availability | Render / BetterUptime Pingers |
