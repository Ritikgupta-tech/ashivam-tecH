import './Logo.css';

/**
 * Official Ashivam Technologies Logo Component
 * Uses the authentic brand identity:
 * - Pure gold infinity emblem
 * - Crisp white Ashivam wordmark
 * - Luminous gold TECHNOLOGIES subline
 * 
 * Supports horizontal lockup, stacked lockup, and mark-only mode.
 */
export default function Logo({
  size = 38,
  variant = 'horizontal', // 'horizontal' | 'stacked' | 'symbol'
  showText = true,
  theme = 'transparent',  // 'transparent' | 'badge'
  className = '',
  alt = 'Ashivam Technologies',
}) {
  const isSymbolOnly = !showText || variant === 'symbol';
  const symbolWidth = Math.round(size * 1.81);

  return (
    <span
      className={`ashivam-logo ashivam-logo--${variant} ashivam-logo--theme-${theme} ${className}`}
      style={{
        '--logo-height': `${size}px`,
      }}
    >
      <img
        src="/logo-symbol.png"
        alt={alt}
        width={symbolWidth}
        height={size}
        className="ashivam-logo__symbol"
        loading="eager"
        decoding="async"
      />
      {!isSymbolOnly && (
        <span className="ashivam-logo__text">
          <span className="ashivam-logo__name">Ashivam</span>
          <span className="ashivam-logo__sub">Technologies</span>
        </span>
      )}
    </span>
  );
}
