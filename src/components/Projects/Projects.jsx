import { useState } from 'react';
import { PROJECTS } from '../../data/content';
import './Projects.css';

const CATEGORIES = ['All', 'Web', 'Mobile', 'Software', 'Experiments'];

const STATUS_COLORS = {
  'Active': '#22c55e',
  'In Development': '#38bdf8',
  'Planning': '#f0c040',
  'Experiment': '#a78bfa',
};

function ProjectCard({ project, index }) {
  return (
    <div
      className={`project-card reveal reveal--scale reveal--delay-${(index % 3) + 1}`}
      role="article"
      aria-labelledby={`project-${project.id}-name`}
    >
      {/* Mock visual */}
      <div className="project-card__image">
        <div className="project-card__image-bg" aria-hidden="true">
          <div className="project-card__image-grid" />
          <div className="project-card__image-icon">{project.tags[0]?.[0] || '⚡'}</div>
        </div>
        <div className="project-card__overlay">
          <a href="#contact" className="project-card__view-btn btn btn-primary" aria-label={`View ${project.name} project`}>
            View Project
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
        {project.featured && (
          <span className="project-card__featured" aria-label="Featured project">⭐ Featured</span>
        )}
      </div>

      <div className="project-card__body">
        <div className="project-card__status" style={{ '--status-color': STATUS_COLORS[project.status] || '#94a3b8' }}>
          <span className="project-card__status-dot" aria-hidden="true" />
          {project.status}
        </div>
        <h3 id={`project-${project.id}-name`} className="project-card__name">{project.name}</h3>
        <p className="project-card__desc">{project.description}</p>
        <div className="project-card__tags" aria-label="Technologies used">
          {project.tags.map((t) => (
            <span key={t} className="project-card__tag">{t}</span>
          ))}
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
          <p className="section-label reveal">Portfolio</p>
          <h2 id="projects-heading" className="reveal reveal--delay-1">
            Ideas. Products. <span className="gradient-text">Experiments.</span>
          </h2>
          <p className="projects__subtitle reveal reveal--delay-2">
            A growing collection of real software projects — from products in development
            to experimental ideas worth building.
          </p>
        </div>

        {/* Filters */}
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
            <p className="projects__empty">No projects in this category yet. Check back soon!</p>
          )}
        </div>
      </div>
    </section>
  );
}
