import './SectionHeading.css';

export default function SectionHeading({
  label,
  title,
  gradientWord,
  titleAfter = '',
  subtitle,
  align = 'center', // 'center' | 'left'
  gold = true,
  className = '',
}) {
  return (
    <div className={`section-heading section-heading--${align} ${className}`}>
      {label && <p className="section-label reveal">{label}</p>}
      <h2 className="section-heading__title reveal reveal--delay-1">
        {title}{' '}
        {gradientWord && (
          <span className={gold ? 'gradient-text-gold' : 'gradient-text'}>
            {gradientWord}
          </span>
        )}{' '}
        {titleAfter}
      </h2>
      {subtitle && (
        <p className="section-heading__subtitle reveal reveal--delay-2">
          {subtitle}
        </p>
      )}
    </div>
  );
}
