import './Section.css';

export default function Section({
  children,
  id,
  className = '',
  container = true,
  divider = false,
  ...props
}) {
  return (
    <>
      {divider && <div className="section-divider" aria-hidden="true" />}
      <section id={id} className={`section ${className}`} {...props}>
        {container ? <div className="container">{children}</div> : children}
      </section>
    </>
  );
}
