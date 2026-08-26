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

    // The net, and it has to be unconditional.
    //
    // It used to reveal only if the element happened to be on screen when
    // the timer fired, once. That is not a failsafe: if the observer never
    // reports — a hidden document does not run the rendering lifecycle, so
    // callbacks are never delivered — the element stays at opacity 0 for the
    // life of the page and the content is simply gone. Position is the
    // observer's job; this one exists for when the observer is not working
    // at all, so it reveals regardless.
    const failsafe = setTimeout(() => {
      setSeen(true);
      observer.disconnect();
    }, FAILSAFE_MS);

    return () => {
      clearTimeout(failsafe);
      observer.disconnect();
    };
  }, [seen, threshold, rootMargin]);

  return [ref, seen];
}
