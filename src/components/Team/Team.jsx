import { TEAM } from '../../data/content';
import './Team.css';

function TeamCard({ member, index }) {
  return (
    <div
      className={`team-card reveal reveal--scale reveal--delay-${(index % 4) + 1}`}
      role="article"
      aria-labelledby={`team-${member.id}-name`}
    >
      {/* Avatar */}
      <div className="team-card__avatar-wrap">
        <div
          className="team-card__avatar"
          style={{ '--accent': member.color }}
          aria-hidden="true"
        >
          <span className="team-card__initials">{member.initials}</span>
          <div className="team-card__avatar-glow" />
        </div>
      </div>

      {/* Info */}
      <div className="team-card__info">
        <h3 id={`team-${member.id}-name`} className="team-card__name">{member.name}</h3>
        <p className="team-card__role">{member.role}</p>
        <p className="team-card__bio">{member.bio}</p>
      </div>

      {/* Social */}
      <div className="team-card__socials" aria-label={`${member.name} social links`}>
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="team-card__social-link"
          aria-label={`${member.name} on LinkedIn`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
            <circle cx="4" cy="4" r="2" />
          </svg>
        </a>
        <a
          href={member.github}
          target="_blank"
          rel="noopener noreferrer"
          className="team-card__social-link"
          aria-label={`${member.name} on GitHub`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        </a>
      </div>

      {/* Border subtle glow */}
      <div className="team-card__border" style={{ '--accent': member.color }} aria-hidden="true" />
    </div>
  );
}

export default function Team() {
  return (
    <section className="team section" id="team" aria-labelledby="team-heading">
      <div className="container">
        <div className="team__header">
          <p className="section-label reveal">The People</p>
          <h2 id="team-heading" className="reveal reveal--delay-1">
            Meet The Engineers{' '}
            <span className="gradient-text-gold">Building Ashivam</span>
          </h2>
          <p className="team__subtitle reveal reveal--delay-2">
            A passionate team of developers, architects and designers collaborating 
            to engineer modern software solutions.
          </p>
        </div>
        <div className="team__grid" role="list">
          {TEAM.map((m, i) => (
            <TeamCard key={m.id} member={m} index={i} />
          ))}
        </div>
        <p className="team__note reveal">
          Headquartered in Agra, India • Team roles and contributor positions are continuously expanding.
        </p>
      </div>
    </section>
  );
}
