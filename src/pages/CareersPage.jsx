import { useEffect } from 'react';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import Careers from '../components/Careers/Careers';
import { LightbulbIcon, ShieldIcon, RocketIcon } from '../components/icons';
import './CareersPage.css';

const CULTURE_PILLARS = [
  {
    icon: RocketIcon,
    title: 'High-Impact Ownership',
    desc: 'Take direct architecture and delivery ownership. We build production systems, not throwaway prototypes.',
  },
  {
    icon: LightbulbIcon,
    title: 'Continuous Mastery',
    desc: 'Work with modern enterprise stacks — React, Spring Boot, Android Kotlin, and cloud microservices.',
  },
  {
    icon: ShieldIcon,
    title: 'Engineering Rigor',
    desc: 'Clean code reviews, test automation, and architectural discipline are foundational in everything we ship.',
  },
];

export default function CareersPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Careers & Open Roles | Ashivam Technologies';
  }, []);

  return (
    <div className="careers-page">
      <Navbar />

      <main className="careers-main" id="main-content">
        {/* Recruitment Hero */}
        <section className="careers-hero section">
          <div className="container">
            <div className="careers-hero__content text-center">
              <div className="careers-hero__badge">
                <span>Join Our Engineering Team</span>
              </div>
              <h1 className="careers-hero__title">
                Build Systems That <span className="gradient-text-gold">Matter</span>
              </h1>
              <p className="careers-hero__desc">
                We are looking for driven software engineers, designers, and systems architects passionate about clean code, high concurrency, and real-world technology delivery.
              </p>
            </div>

            {/* Culture Pillars */}
            <div className="careers-culture-grid">
              {CULTURE_PILLARS.map((col, idx) => {
                const IconComponent = col.icon;
                return (
                  <div key={idx} className="careers-culture-card">
                    <div className="careers-culture-card__icon" aria-hidden="true">
                      <IconComponent size={22} />
                    </div>
                    <h3>{col.title}</h3>
                    <p>{col.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Live Job Board & Application System */}
        <div className="careers-board-wrapper">
          <Careers />
        </div>
      </main>

      <Footer />
    </div>
  );
}
