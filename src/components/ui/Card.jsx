import './Card.css';

export default function Card({
  children,
  variant = 'default', // 'default' | 'elevated' | 'interactive'
  className = '',
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`comp-card comp-card--${variant} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
