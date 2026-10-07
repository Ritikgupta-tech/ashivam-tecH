import { LightbulbIcon, GearIcon, DesignIcon, RocketIcon } from '../icons';
import './About.css';

const PILLARS = [
  { Icon: LightbulbIcon, title: 'Innovation', desc: 'Pushing boundaries with fresh ideas and creative engineering.' },
  { Icon: GearIcon, title: 'Engineering', desc: 'Clean, scalable code built with modern best practices.' },
  { Icon: DesignIcon, title: 'Design', desc: 'User-first thinking that balances beauty and function.' },
  { Icon: RocketIcon, title: 'Impact', desc: 'Building solutions that create real-world value.' },
];

export default function About() {
  return (
    <section className="about section" id="about" aria-labelledby="about-heading">
      <div className="container">
        <div className="about__inner">
          {/* Left: text */}
          <div className="about__text">
            <p className="section-label reveal">Our Story</p>
            <h2 id="about-heading" className="about__heading reveal reveal--delay-1">
              Building Digital Experiences{' '}
              <span className="gradient-text-gold">With Purpose</span>
            </h2>
            <p className="about__desc reveal reveal--delay-2">
              Ashivam Technologies is a technology-driven company headquartered in Agra, India, focused on creating useful,
              scalable and modern digital solutions. We believe that great software is not just
              about writing code — it's about understanding people, solving real problems, and
              delivering experiences that truly matter.
            </p>
            <p className="about__desc reveal reveal--delay-3">
              From enterprise web applications to mobile experiences and backend architectures, we approach every
              project with craftsmanship, architectural rigor, and an uncompromising commitment to user satisfaction.
            </p>

            <div className="about__values reveal reveal--delay-4" aria-label="Core company values">
              {['Innovation', 'Quality First', 'User-Centric', 'Architectural Rigor', 'Scalability', 'Continuous Learning'].map((v) => (
                <span key={v} className="about__value-tag">{v}</span>
              ))}
            </div>
          </div>

          {/* Right: visual */}
          <div className="about__visual reveal reveal--right reveal--delay-2">
            <div className="about__visual-inner">
              {/* Center logo glow */}
              <div className="about__visual-core">
                <img src="/logo.svg" alt="Ashivam Technologies" className="about__visual-logo" />
                <div className="about__visual-ring about__visual-ring--1" aria-hidden="true" />
                <div className="about__visual-ring about__visual-ring--2" aria-hidden="true" />
              </div>

              {/* Pillar cards with SVG icons */}
              {PILLARS.map((p, i) => {
                const IconComponent = p.Icon;
                return (
                  <div
                    key={p.title}
                    className={`about__pillar float-${(i % 4) + 1}`}
                    style={{
                      '--angle': `${i * 90}deg`,
                      animationDelay: `${i * 0.3}s`,
                    }}
                    aria-label={`${p.title}: ${p.desc}`}
                  >
                    <span className="about__pillar-icon" aria-hidden="true">
                      <IconComponent size={20} />
                    </span>
                    <div>
                      <div className="about__pillar-title">{p.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
