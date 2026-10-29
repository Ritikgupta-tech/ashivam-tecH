import { useMemo } from 'react';
import {
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '../icons';

/**
 * Metric stat card adapting MaytrixTech attention tone pattern.
 */
export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'default', // 'default' | 'attention'
  onClick,
}) {
  const isAttention = tone === 'attention' && Number(value) > 0;
  const isClickable = Boolean(onClick);

  return (
    <div
      className={`admin-stat-card ${
        isAttention ? 'admin-stat-card--attention' : ''
      } ${isClickable ? 'admin-stat-card--clickable' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="admin-stat-header">
        <span className="admin-stat-label">{label}</span>
        {Icon && (
          <span className="admin-stat-icon-wrap" aria-hidden="true">
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="admin-stat-value-row">
        <span className="admin-stat-value">{value ?? 0}</span>
      </div>
      {subtext && <p className="admin-stat-subtext">{subtext}</p>}
    </div>
  );
}

/**
 * Structured content container panel.
 */
export function Panel({ title, description, actions, children, className = '' }) {
  return (
    <section className={`admin-panel ${className}`}>
      {(title || actions || description) && (
        <div className="admin-panel-header">
          <div className="admin-panel-heading">
            {title && <h2 className="admin-panel-title">{title}</h2>}
            {description && (
              <p className="admin-panel-description">{description}</p>
            )}
          </div>
          {actions && <div className="admin-panel-actions">{actions}</div>}
        </div>
      )}
      <div className="admin-panel-body">{children}</div>
    </section>
  );
}

/**
 * Tone-based status badge pill.
 */
export function StatusBadge({
  label,
  tone = 'slate', // 'green' | 'amber' | 'red' | 'blue' | 'slate'
  size = 'md', // 'sm' | 'md'
}) {
  const toneClass = `admin-badge--${tone}`;
  const sizeClass = size === 'sm' ? 'admin-badge--sm' : '';

  return (
    <span className={`admin-status-badge ${toneClass} ${sizeClass}`}>
      {label}
    </span>
  );
}

/**
 * Filter bar with search, dropdowns, and clear controls.
 */
export function FilterBar({
  search = '',
  onSearchChange,
  placeholder = 'Search records...',
  filters = [],
  activeChips = [],
  onClear,
  children,
}) {
  return (
    <div className="admin-filter-bar">
      <div className="admin-filter-row">
        {onSearchChange && (
          <div className="admin-search-wrap">
            <SearchIcon size={16} className="admin-search-icon" />
            <input
              type="text"
              className="admin-search-input"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
            />
            {search && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
              >
                <XMarkIcon size={14} />
              </button>
            )}
          </div>
        )}

        {filters.map((f) => (
          <div key={f.id} className="admin-filter-select-wrap">
            {f.label && <label className="sr-only" htmlFor={f.id}>{f.label}</label>}
            <select
              id={f.id}
              className="admin-filter-select"
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              aria-label={f.label || f.id}
            >
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {children}

        {onClear && (
          <button
            type="button"
            className="admin-btn admin-btn--quiet"
            onClick={onClear}
          >
            Reset Filters
          </button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="admin-chips-row">
          <span className="admin-chips-label">Active:</span>
          {activeChips.map((c) => (
            <span key={c.id} className="admin-chip">
              <span>{c.label}</span>
              <button
                type="button"
                className="admin-chip-remove"
                onClick={c.onRemove}
                aria-label={`Remove filter ${c.label}`}
              >
                <XMarkIcon size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Standardized pagination bar with page selector and records count.
 */
export function PaginationBar({
  page = 1,
  totalPages = 1,
  totalCount = 0,
  limit = 20,
  onPageChange,
  onLimitChange,
}) {
  const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  const pages = useMemo(() => {
    const list = [];
    const maxButtons = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  }, [page, totalPages]);

  if (totalCount <= 0 && totalPages <= 1) {
    return null;
  }

  return (
    <div className="admin-pagination-bar" aria-label="Pagination">
      <div className="admin-pagination-info">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of{' '}
        <strong>{totalCount}</strong> results
      </div>

      <div className="admin-pagination-controls">
        {onLimitChange && (
          <select
            className="admin-pagination-limit"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label="Items per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        )}

        <button
          type="button"
          className="admin-page-nav-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeftIcon size={16} />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`admin-page-num-btn ${
              p === page ? 'admin-page-num-btn--active' : ''
            }`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="admin-page-nav-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Standardized data table with overflow-x scrolling.
 */
export function DataTable({
  caption,
  columns = [],
  data = [],
  renderRow,
  keyExtractor = (item, idx) => item._id || item.id || idx,
  emptyMessage = 'No records match your filters.',
  isLoading = false,
}) {
  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key || col.label}
                className={col.className || ''}
                style={col.style}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="admin-spinner" style={{ margin: '0 auto 0.75rem' }} />
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  Loading table data...
                </span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState description={emptyMessage} />
              </td>
            </tr>
          ) : (
            data.map((item, idx) => renderRow(item, idx, keyExtractor(item, idx)))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Accessible dashed-border empty state.
 */
export function EmptyState({
  icon: Icon = InformationCircleIcon,
  title = 'No Data Available',
  description = 'There are no records to display at this time.',
  action,
}) {
  return (
    <div className="admin-empty-state">
      <span className="admin-empty-icon" aria-hidden="true">
        <Icon size={32} />
      </span>
      {title && <h3 className="admin-empty-title">{title}</h3>}
      {description && <p className="admin-empty-desc">{description}</p>}
      {action && <div className="admin-empty-action">{action}</div>}
    </div>
  );
}

/**
 * Shimmer loading skeleton.
 */
export function LoadingSkeleton({ rows = 4, height = 36 }) {
  return (
    <div className="admin-skeleton-stack" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="admin-skeleton-row"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}
