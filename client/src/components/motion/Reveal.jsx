import { useReveal } from '../../hooks/useReveal.js';

/**
 * Reveals its children the first time they scroll into view.
 * A thin wrapper over the reveal classes in motion.css so pages stay declarative.
 */
export function Reveal({ as: Tag = 'div', variant, delay = 0, className = '', children, ...rest }) {
  const [ref, seen] = useReveal();
  const classes = [
    'reveal',
    variant ? `reveal--${variant}` : '',
    seen ? 'is-in' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag ref={ref} className={classes} style={{ '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}

/** Applies an index-based stagger to its direct children. */
export function Stagger({ as: Tag = 'div', step = 90, className = '', children, ...rest }) {
  return (
    <Tag className={`stagger ${className}`} style={{ '--stagger-step': `${step}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
