import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion.js';

/**
 * Reveals text one character at a time, for the moment the user's name is
 * written onto the passport.
 *
 * `animate: false` shows the finished text immediately rather than nothing —
 * the animation is a flourish, and turning it off must never cost the reader
 * the information. Reduced motion takes the same path.
 */
export function useTypewriter(text = '', { speed = 55, startDelay = 300, animate = true } = {}) {
  const reduced = useReducedMotion();
  const instant = reduced || !animate || !text;

  const [shown, setShown] = useState(instant ? text : '');

  useEffect(() => {
    if (instant) { setShown(text); return undefined; }

    setShown('');
    let index = 0;
    let tick;
    const start = setTimeout(() => {
      tick = setInterval(() => {
        index += 1;
        setShown(text.slice(0, index));
        if (index >= text.length) clearInterval(tick);
      }, speed);
    }, startDelay);

    return () => { clearTimeout(start); clearInterval(tick); };
  }, [text, speed, startDelay, instant]);

  return { shown, done: shown.length >= text.length };
}
