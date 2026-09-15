import { Link } from 'react-router-dom';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import './Button.css';

/**
 * One button, four variants, per docs/05-DESIGN-SYSTEM.md §5.3.
 * Renders as <a>, <Link> or <button> depending on what it is asked to do,
 * so a navigation always ends up as a real link.
 *
 * Interaction: a highlight follows the pointer across the face, and a press
 * sends a ripple out from the exact point that was pressed. Both write to the
 * element directly rather than through state, so hovering never re-renders
 * the page the button sits in. Reduced motion keeps the colour changes and
 * drops the movement.
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
  onPointerMove,
  onPointerDown,
  ...rest
}) {
  const reduced = useReducedMotion();

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    full ? 'btn--full' : '',
    loading ? 'btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  const track = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
    onPointerMove?.(e);
  };

  const ripple = (e) => {
    onPointerDown?.(e);
    if (reduced || disabled || loading) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const dot = document.createElement('span');
    dot.className = 'btn__ripple';
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - r.left - size / 2}px`;
    dot.style.top = `${e.clientY - r.top - size / 2}px`;
    el.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  };

  const handlers = { onPointerMove: track, onPointerDown: ripple };

  const content = (
    <>
      <span className="btn__glow" aria-hidden="true" />
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span className="btn__label">{children}</span>
    </>
  );

  if (to) return <Link to={to} className={classes} {...handlers} {...rest}>{content}</Link>;
  if (href) return <a href={href} className={classes} {...handlers} {...rest}>{content}</a>;

  const Tag = as || 'button';
  return (
    <Tag className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...handlers} {...rest}>
      {content}
    </Tag>
  );
}
