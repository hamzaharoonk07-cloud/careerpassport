import { Link } from 'react-router-dom';
import './Button.css';

/**
 * One button, four variants, per docs/05-DESIGN-SYSTEM.md §5.3.
 * Renders as <a>, <Link> or <button> depending on what it is asked to do,
 * so a navigation always ends up as a real link.
 */
export function Button({
  as,
  to,
  href,
  variant = 'primary',
  size = 'md',
  full = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    full ? 'btn--full' : '',
    loading ? 'btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span className="btn__label">{children}</span>
    </>
  );

  if (to) return <Link to={to} className={classes} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={classes} {...rest}>{content}</a>;

  const Tag = as || 'button';
  return (
    <Tag className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </Tag>
  );
}
