import { useEffect, useState } from 'react';

/**
 * True when the visitor has asked their system for less motion.
 *
 * Every cinematic beat checks this and degrades to a plain cut instead of
 * skipping the content — reduced motion means fewer animations, not less product.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
