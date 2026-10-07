import { useState } from 'react';
import { PROJECTS } from '../../data/content';
import { StarIcon, ArrowRightIcon, TECH_ICON_MAP, SoftwareIcon } from '../icons';
import './Projects.css';

const CATEGORIES = ['All', 'Web', 'Mobile', 'Software', 'Experiments'];

const STATUS_CONFIG = {
  'Active': { label: 'Active', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  'In Development': { label: 'In Development', color: '#e6c55c', bg: 'rgba(230, 197, 92, 0.12)' },
  'Planning': { label: 'Planning', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.12)' },
  'Experiment': { label: 'Experiment', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)' },
};

function ProjectCard({ project, index }) {
  const primaryTag = project.tags[0];
  const PrimaryTagIcon = TECH_ICON_MAP[primaryTag] || SoftwareIcon;
  const statusInfo = STATUS_CONFIG[project.status] || { label: project.status, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };

  return (
    <div
      className={`project-card reveal reveal--scale reveal--delay-${(index % 3) + 1}`}
      role="article"
      aria-labelledby={`project-${project.id}-name`}
    >
      {/* Visual Header */}
      <div className="project-card__image">
        <div className="project-card__image-bg" aria-hidden="true">
          <div className="project-card__image-grid" />
          <div className="project-card__image-icon">
            <PrimaryTagIcon size={38} className="project-card__brand-icon" />
          </div>
        </div>
        <div className="project-card__overlay">
          <a href="#contact" className="project-card__view-btn btn btn-primary" aria-label={`Inquire about ${project.name}`}>
            <span>Project Inquiry</span>
            <ArrowRightIcon size={14} />
          </a>
        </div>
        {project.featured && (
          <span className="project-card__featured" aria-label="Featured project">
            <StarIcon size={12} />
            <span>Featured</span>
          </span>
        )}
      </div>

      {/* Card Content Body */}
      <div className="project-card__body">
        <div
          className="project-card__status"
          style={{ '--status-color': statusInfo.color, '--status-bg': statusInfo.bg }}
        >
          <span className="project-card__status-dot" aria-hidden="true" />
          <span>{project.status}</span>
        </div>

        <h3 id={`project-${project.id}-name`} className="project-card__name">
          {project.name}
        </h3>
        <p className="project-card__desc">{project.description}</p>

        <div className="project-card__tags" aria-label="Technologies used">
          {project.tags.map((t) => {
            const TagIcon = TECH_ICON_MAP[t];
            return (
              <span key={t} className="project-card__tag">
                {TagIcon && <TagIcon size={12} className="project-card__tag-icon" />}
                <span>{t}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = PROJECTS.filter(
    (p) => activeFilter === 'All' || p.category.toLowerCase() === activeFilter.toLowerCase()
  );

  return (
    <section className="projects section" id="projects" aria-labelledby="projects-heading">
      <div className="container">
        <div className="projects__header">
          <p className="section-label reveal">Portfolio & Case Studies</p>
          <h2 id="projects-heading" className="reveal reveal--delay-1">
            Engineered Products &{' '}
            <span className="gradient-text-gold">Innovations</span>
          </h2>
          <p className="projects__subtitle reveal reveal--delay-2">
            A curated portfolio of software products, enterprise platforms, and experimental digital architectures.
          </p>
        </div>

        {/* Category Filters */}
        <div className="projects__filters reveal reveal--delay-3" role="group" aria-label="Project category filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`projects__filter-btn${activeFilter === cat ? ' projects__filter-btn--active' : ''}`}
              onClick={() => setActiveFilter(cat)}
              aria-pressed={activeFilter === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="projects__grid" aria-live="polite" aria-label="Filtered projects">
          {filtered.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
          {filtered.length === 0 && (
            <p className="projects__empty">No projects found in this category.</p>
          )}
        </div>
      </div>
    </section>
  );
}
