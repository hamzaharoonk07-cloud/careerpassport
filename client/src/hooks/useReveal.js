import { useEffect, useRef, useState } from 'react';

/**
 * Adds `is-in` to an element the first time it enters the viewport.
 *
 * One observer per element, disconnected on first hit — scroll reveals should
 * not keep an observer alive for the life of the page.
 *
 * A reveal starts at `opacity: 0`, which means a broken observer does not
 * degrade the animation, it hides the content. So there are two safety nets:
 * no IntersectionObserver at all reveals immediately, and a hard timeout
 * reveals anything the observer has not reported on. Content is never allowed
 * to stay invisible because a decoration failed.
 */
const FAILSAFE_MS = 3000;

export function useReveal({ threshold = 0.18, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;

    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);

    // If the element is already on screen when it mounts, the observer will
    // report it on the next frame — but if anything goes wrong, this fires.
    const failsafe = setTimeout(() => {
      const r = el.getBoundingClientRect();
      const onScreen = r.top < window.innerHeight && r.bottom > 0;
      if (onScreen) {
        setSeen(true);
        observer.disconnect();
      }
    }, FAILSAFE_MS);

    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [seen, threshold, rootMargin]);

  return [ref, seen];
}
