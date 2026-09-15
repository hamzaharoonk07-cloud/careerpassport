import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import '../../styles/route-transition.css';

/** What the curtain says while it crosses: where you are going. */
const LABELS = [
  ['/airport', 'Terminal'],
  ['/interests', 'Choose your field'],
  ['/passport', 'Passport'],
  ['/quiz', 'Questions'],
  ['/analysis', 'Analysing'],
  ['/result', 'Your report'],
  ['/roadmap', 'Roadmap'],
  ['/dashboard', 'Dashboard'],
  ['/careers', 'Career Bank'],
  ['/media', 'Multimedia'],
  ['/stories', 'Stories'],
  ['/feedback', 'Feedback'],
  ['/account', 'Account'],
  ['/admin', 'Control tower'],
  ['/login', 'Sign in'],
  ['/register', 'Get a passport'],
];
const labelFor = (path) => (path === '/' ? 'Home' : LABELS.find(([p]) => path.startsWith(p))?.[1] || 'PathSeeker');

const DURATION = 760;

/**
 * The page change, as a departure.
 *
 * A navy curtain with a gold leading edge is across the screen the instant
 * the route changes, names the destination, and sweeps off to the right to
 * uncover the new page. It never delays navigation: the new page is already
 * rendering underneath. A second navigation mid-sweep restarts it, and
 * reduced motion skips it entirely (the page itself still fades in).
 */
export function RouteTransition() {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const previous = useRef(pathname);
  const [run, setRun] = useState(null);

  useEffect(() => {
    if (previous.current === pathname) return undefined;
    previous.current = pathname;
    if (reduced) return undefined;

    setRun({ key: Date.now(), label: labelFor(pathname) });
    const t = setTimeout(() => setRun(null), DURATION);
    return () => clearTimeout(t);
  }, [pathname, reduced]);

  if (!run) return null;

  return (
    <div className="rtx" key={run.key} aria-hidden="true">
      <div className="rtx__panel">
        <span className="rtx__label">{run.label}</span>
      </div>
      <span className="rtx__edge">
        <svg className="rtx__plane" viewBox="0 0 24 24" width="30" height="30">
          <path fill="currentColor" d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" transform="rotate(90 12 12)" />
        </svg>
      </span>
    </div>
  );
}
