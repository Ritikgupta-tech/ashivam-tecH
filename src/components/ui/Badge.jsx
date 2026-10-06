import './Badge.css';

export default function Badge({
  children,
  variant = 'gold', // 'gold' | 'neutral' | 'success' | 'warning' | 'purple' | 'cyan' (legacy)
  dot = false,
  className = '',
}) {
  // Gracefully map legacy 'cyan' to gold
  const normalizedVariant = variant === 'cyan' ? 'gold' : variant;

  return (
    <span className={`comp-badge comp-badge--${normalizedVariant} ${className}`}>
      {dot && <span className="comp-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
