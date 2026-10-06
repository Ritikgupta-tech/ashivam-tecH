import './Logo.css';

/**
 * Official Ashivam Technologies Logo Component
 * Uses the authentic brand identity:
 * - Gold emblem
 * - Black Ashivam wordmark
 * - Gold TECHNOLOGIES subline
 * 
 * Supports horizontal lockup, stacked lockup, and mark-only mode.
 */
export default function Logo({
  size = 38,
  variant = 'horizontal', // 'horizontal' | 'stacked' | 'symbol'
  showText = true,
  theme = 'badge',        // 'badge' | 'transparent'
  className = '',
  alt = 'Ashivam Technologies',
}) {
  const isSymbolOnly = !showText || variant === 'symbol';
  
  let src = '/logo-horizontal.png';
  let aspectRatio = '670 / 140';
  let width = Math.round(size * (670 / 140));

  if (isSymbolOnly) {
    src = '/logo-symbol.png';
    aspectRatio = '320 / 184';
    width = Math.round(size * (320 / 184));
  } else if (variant === 'stacked') {
    src = '/logo-official.png';
    aspectRatio = '390 / 287';
    width = Math.round(size * (390 / 287));
  }

  // When symbol only, badge is typically not required
  const effectiveTheme = isSymbolOnly ? (theme === 'badge' ? 'transparent' : theme) : theme;

  return (
    <span
      className={`ashivam-logo ashivam-logo--${variant} ashivam-logo--theme-${effectiveTheme} ${className}`}
      style={{
        '--logo-height': `${size}px`,
        '--logo-width': `${width}px`,
        '--logo-aspect': aspectRatio,
      }}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={size}
        className="ashivam-logo__image"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
