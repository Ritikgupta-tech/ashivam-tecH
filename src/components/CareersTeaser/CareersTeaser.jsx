import { Link } from 'react-router-dom';
import { RocketIcon, LightbulbIcon, ShieldIcon, ArrowRightIcon } from '../icons';
import './CareersTeaser.css';

const HIGHLIGHTS = [
  {
    icon: RocketIcon,
    title: 'High-Impact Ownership',
    desc: 'Take direct architecture and delivery ownership on production systems.',
  },
  {
    icon: LightbulbIcon,
    title: 'Modern Tech Stack',
    desc: 'Build with React, Spring Boot, Android Kotlin, and cloud architectures.',
  },
  {
    icon: ShieldIcon,
    title: 'Engineering Rigor',
    desc: 'Clean code reviews, test automation, and zero legacy debt.',
  },
];

export default function CareersTeaser() {
  return (
    <section className="careers-teaser section" id="careers-teaser" aria-labelledby="careers-teaser-heading">
      <div className="container">
        <div className="careers-teaser__card reveal">
          <div className="careers-teaser__badge">
            <span>Careers at Ashivam</span>
          </div>

          <h2 id="careers-teaser-heading" className="careers-teaser__title">
            Build Systems That <span className="gradient-text-gold">Matter</span>
          </h2>

          <p className="careers-teaser__desc">
            We are actively looking for driven software engineers, mobile developers, and systems architects
            passionate about clean code, high concurrency, and real-world technology delivery.
          </p>

          <div className="careers-teaser__grid">
            {HIGHLIGHTS.map((item, i) => {
              const IconComp = item.icon;
              return (
                <div key={i} className="careers-teaser__item">
                  <div className="careers-teaser__item-icon" aria-hidden="true">
                    <IconComp size={20} />
                  </div>
                  <div>
                    <h3 className="careers-teaser__item-title">{item.title}</h3>
                    <p className="careers-teaser__item-desc">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="careers-teaser__actions">
            <Link to="/careers" className="btn btn-primary">
              <span>View Open Positions & Apply</span>
              <ArrowRightIcon size={16} />
            </Link>
            <Link to="/careers" className="btn btn-secondary">
              <span>Explore Engineering Culture</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
