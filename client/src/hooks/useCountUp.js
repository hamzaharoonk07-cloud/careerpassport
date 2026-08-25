import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion.js';

/**
 * Counts from 0 up to `target` on a requestAnimationFrame loop.
 *
 * Driven by elapsed time rather than a fixed step count, so the duration is
 * the same on a 60Hz and a 144Hz display. Reduced motion jumps to the value.
 */
export function useCountUp(target = 0, { duration = 1600, start = true, delay = 0 } = {}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  const frame = useRef(null);

  useEffect(() => {
    if (reduced || !start) { setValue(target); return undefined; }

    let startTime = null;
    const begin = setTimeout(() => {
      const step = (now) => {
        if (startTime === null) startTime = now;
        const progress = Math.min(1, (now - startTime) / duration);
        // easeOutExpo — fast out of the gate, settling gently on the number
        const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
        setValue(Math.round(target * eased));
        if (progress < 1) frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(begin);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration, start, delay, reduced]);

  return value;
}
