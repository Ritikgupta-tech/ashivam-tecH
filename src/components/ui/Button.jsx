import './Button.css';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'outline' | 'gold' | 'ghost'
  size = 'md',        // 'sm' | 'md' | 'lg'
  type = 'button',
  icon,
  iconPosition = 'right',
  loading = false,
  href,
  className = '',
  onClick,
  disabled = false,
  ...props
}) {
  const isDisabled = disabled || loading;
  const btnClass = `btn-comp btn-comp--${variant} btn-comp--${size} ${loading ? 'btn-comp--loading' : ''} ${className}`;

  const content = (
    <>
      {loading && <span className="btn-comp__spinner" aria-hidden="true" />}
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-comp__icon btn-comp__icon--left">{icon}</span>
      )}
      <span className="btn-comp__text">{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-comp__icon btn-comp__icon--right">{icon}</span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={btnClass}
        onClick={onClick}
        aria-busy={loading ? 'true' : undefined}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={btnClass}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  );
}
