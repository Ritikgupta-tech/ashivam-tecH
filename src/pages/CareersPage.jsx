import { useEffect } from 'react';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import Careers from '../components/Careers/Careers';
import Culture from '../components/Culture/Culture';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { ArrowRightIcon } from '../components/icons';
import { updatePageMeta } from '../utils/seo';
import './CareersPage.css';

export default function CareersPage() {
  useScrollReveal();

  useEffect(() => {
    window.scrollTo(0, 0);
    updatePageMeta({
      title: 'Careers & Open Roles | Ashivam Technologies',
      description: 'Explore engineering and technology careers at Ashivam Technologies. Join our team building scalable software architectures and innovative platforms.',
      canonical: 'https://ashivam-tec-h.vercel.app/careers',
    });
  }, []);

  return (
    <div className="careers-page">
      <Navbar />

      <main className="careers-main" id="main-content">
        {/* Recruitment Hero */}
        <section className="careers-hero" aria-labelledby="careers-hero-heading">
          <div className="container">
            <div className="careers-hero__content text-center">
              <div className="careers-hero__badge">
                <span>Careers • Engineering & Product</span>
              </div>
              <h1 id="careers-hero-heading" className="careers-hero__title">
                Build Systems That <span className="gradient-text-gold">Matter</span>
              </h1>
              <p className="careers-hero__desc">
                Ashivam Technologies is assembling an elite software engineering culture in Agra, India.
                We welcome ambitious developers, systems architects, and creative designers ready to take direct ownership of real-world production software.
              </p>

              {/* Quick Trust Highlights Strip */}
              <div className="careers-hero__highlights">
                <div className="careers-hero__chip">
                  <span className="careers-hero__chip-dot" />
                  <span>Agra, UP / Hybrid & Remote</span>
                </div>
                <div className="careers-hero__chip">
                  <span className="careers-hero__chip-dot" />
                  <span>Full-Time & Contribution Tracks</span>
                </div>
                <div className="careers-hero__chip">
                  <span className="careers-hero__chip-dot" />
                  <span>Production Software Ownership</span>
                </div>
              </div>

              {/* Action Jump Buttons */}
              <div className="careers-hero__actions">
                <a href="#careers" className="btn btn-primary">
                  <span>Explore Open Vacancies</span>
                  <ArrowRightIcon size={16} />
                </a>
                <a href="#culture" className="btn btn-outline">
                  <span>Workplace Culture</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Live Job Board & Application System */}
        <div className="careers-board-wrapper">
          <Careers />
        </div>

        {/* Detailed Engineering Culture & Workplace Values */}
        <Culture />
      </main>

      <Footer />
    </div>
  );
}
