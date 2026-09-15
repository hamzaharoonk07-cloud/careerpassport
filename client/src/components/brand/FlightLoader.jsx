import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Logo } from './Logo.jsx';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import './FlightLoader.css';

/* A fixed star field: generated once from a seeded sequence, so it is the
   same sky on every load rather than a new random one each render. */
const STARS = (() => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: 110 }, () => ({
    x: rnd() * 1600,
    y: rnd() * 620,
    r: 0.4 + rnd() * 1.4,
    d: (rnd() * 4).toFixed(2),
  }));
})();

/* The climb, off the runway at the lower left to cruise at the upper right.
   The scene is scaled to cover the screen, which crops its sides on a tall
   phone, so portrait gets a steeper route through the part that stays in
   view. Cruise is kept clear of the edge so the aircraft is never cut off. */
const FLIGHTS = {
  landscape: { route: 'M 150 790 C 250 690, 620 470, 1340 190', runway: 60, cruise: [1340, 190] },
  portrait: { route: 'M 630 800 C 700 720, 800 560, 950 250', runway: 610, cruise: [950, 250] },
};

/** Cruising altitude, and what a full bar means. */
const CRUISE_FT = 38000;

/** How long the readout sits at cruise before handing over, in ms. */
const LEVEL_OFF = 260;

/**
 * The loading state, as a climb out.
 *
 * A percentage is the one number this product has no honest way to show while
 * a route is loading — nothing reports how far a dynamic import has got, so
 * any figure would be invented. An altitude is invented too, but it does not
 * pretend to be a measurement: it reads as the aircraft climbing, which is
 * what the wait actually is here. The bar is the flight path and the plane
 * sits on it, so how far along it has travelled is the progress.
 *
 * Three phases:
 *
 *   climbing  Indeterminate. Eases toward cruise and never arrives — a bar
 *             that reaches the end and then keeps waiting reads as broken.
 *   levelling `done` has been set: the work finished. Runs the rest of the
 *             way, quickly, so the climb resolves instead of being cut off.
 *   arrived   Held at cruise for a beat, then `onComplete` hands over.
 *
 * `progress` (0–1) drives it directly where a real figure exists.
 */
export function FlightLoader({ label = 'Climbing out', progress, done = false, onComplete }) {
  const reduced = useReducedMotion();
  const determinate = typeof progress === 'number';
  const [p, setP] = useState(determinate ? progress : 0);
  const raf = useRef(null);
  const finished = useRef(false);

  // The frame loop owns these nodes and the current position; React only
  // renders when something it is responsible for actually changes.
  const flownRef = useRef(null);
  const planeRef = useRef(null);
  const altRef = useRef(null);
  const routeRef = useRef(null);
  const barRef = useRef(null);
  const pRef = useRef(determinate ? progress : 0);

  // Kept in a ref as well as state: the animation loop below reads it every
  // frame and must not be torn down and restarted when it changes, or the
  // climb visibly stutters at the moment of handover.
  const doneRef = useRef(done);
  doneRef.current = done;

  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (determinate) {
      const v = Math.min(1, Math.max(0, progress));
      pRef.current = v;
      setP(v);
      return undefined;
    }

    // Reduced motion gets the readout without the climb: straight to cruise,
    // held long enough to be seen, then handover.
    if (reduced) {
      pRef.current = done ? 1 : 0.7;
      setP(pRef.current);
      if (done && !finished.current) {
        finished.current = true;
        const t = setTimeout(() => completeRef.current?.(), LEVEL_OFF);
        return () => clearTimeout(t);
      }
      return undefined;
    }

    // Safety net. The climb is driven by requestAnimationFrame, which a
    // browser stops delivering entirely while a tab is in the background.
    // The route overlay is opaque and covers a page that has already
    // mounted, so a climb that never finishes is not a slow animation — it
    // is content the reader cannot reach. Once the work is done, hand over
    // within a fixed wall-clock window whatever the frames are doing.
    let bail;
    if (done && !finished.current) {
      bail = setTimeout(() => {
        if (finished.current) return;
        finished.current = true;
        pRef.current = 1;
        setP(1);
        completeRef.current?.();
      }, 1200);
    }

    /* The bar is moved directly, not through React.
       It used to call setState on every animation frame, which re-rendered
       the whole component sixty times a second, and the moved elements also
       carried a 120ms CSS transition. Between them the transition never got
       to finish before the next frame restarted it, so the plane arrived in
       small visible steps instead of gliding — the animation was fighting
       itself. The frame loop writes the two styles straight onto the nodes
       now, and React is only told when the *rounded* altitude changes, which
       is a few times a second rather than sixty. */
    let alive = true;
    let pos = pRef.current;
    let shownFeet = -1;

    const paint = () => {
      placeOnRoute(pos);

      const feet = Math.round((pos * CRUISE_FT) / 100) * 100;
      if (feet !== shownFeet) {
        shownFeet = feet;
        if (altRef.current) altRef.current.textContent = feet.toLocaleString('en-US');
      }
    };

    const tick = () => {
      if (!alive) return;

      // Climbing: the step shrinks with the distance left, so the bar moves
      // quickly while there is runway and crawls near the top — which is how
      // a real wait feels.
      if (!doneRef.current) {
        pos += (0.92 - pos) * 0.018;
      } else {
        // Levelling off: close the remaining gap fast enough to feel like a
        // resolution rather than a second wait.
        pos += (1 - pos) * 0.12;
        if (pos >= 0.999 && !finished.current) {
          pos = 1;
          finished.current = true;
          setP(1); // one render, so the label can say "Cruising altitude"
          setTimeout(() => completeRef.current?.(), LEVEL_OFF);
        }
      }

      pRef.current = pos;
      paint();
      raf.current = requestAnimationFrame(tick);
    };

    paint();
    raf.current = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf.current); clearTimeout(bail); };
  }, [determinate, progress, reduced, done]);

  /* Puts the flown trail and the aircraft at a fraction of the climb.
     The route is one SVG path with pathLength="1", so the trail is a dash of
     length `pos`, and the aircraft sits at the same point along the curve,
     nosed along its tangent. */
  function placeOnRoute(pos) {
    const route = routeRef.current;
    if (flownRef.current) flownRef.current.style.strokeDasharray = `${pos} 1`;
    if (barRef.current) barRef.current.style.transform = `scaleX(${pos})`;
    if (!route || !planeRef.current) return;
    const len = route.getTotalLength();
    const at = Math.min(len, Math.max(0, pos * len));
    const a = route.getPointAtLength(Math.max(0, at - 1));
    const b = route.getPointAtLength(Math.min(len, at + 1));
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    const pt = route.getPointAtLength(at);
    planeRef.current.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${angle})`);
  }

  // Keep the drawing in step with state-driven values (determinate progress,
  // reduced motion, the final frame) as well as the frame loop.
  useEffect(() => { placeOnRoute(pRef.current); });

  // Rounded to the nearest hundred feet: an altimeter that changed by single
  // feet sixty times a second would be noise, not a readout.
  const feet = Math.round((p * CRUISE_FT) / 100) * 100;
  const pct = Math.round(p * 100);
  const atCruise = p >= 0.999;

  const [flight] = useState(() =>
    (typeof window !== 'undefined' && window.innerHeight > window.innerWidth * 1.15) ? FLIGHTS.portrait : FLIGHTS.landscape
  );
  const [cx, cy] = flight.cruise;

  const screen = (
    <div
      className={`fload ${atCruise ? 'fload--cruise' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? pct : undefined}
      aria-valuetext={`${label} — ${feet.toLocaleString('en-US')} feet`}
      aria-label={label}
    >
      {/* The sky fills the window. Cloud sits in three layers moving at
          different speeds, which is what reads as depth and forward motion. */}
      <div className="fload__sky" aria-hidden="true">
        <div className="fload__clouds fload__clouds--far" />
        <div className="fload__clouds fload__clouds--mid" />

        <svg className="fload__scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="fload-trail" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="#c9a227" stopOpacity="0" />
              <stop offset="0.5" stopColor="#d9b84a" stopOpacity="0.7" />
              <stop offset="1" stopColor="#fff1c2" />
            </linearGradient>
            <radialGradient id="fload-horizon" cx="0.5" cy="1" r="0.75">
              <stop offset="0" stopColor="#e8a84a" stopOpacity="0.55" />
              <stop offset="0.35" stopColor="#8a5a2a" stopOpacity="0.25" />
              <stop offset="1" stopColor="#0b1533" stopOpacity="0" />
            </radialGradient>
          </defs>

          {STARS.map((st, i) => (
            <circle key={i} className="fload__star" cx={st.x} cy={st.y} r={st.r} style={{ animationDelay: `${st.d}s` }} />
          ))}

          {/* Horizon glow, the curve of the earth, and a city's lights on it */}
          <rect x="0" y="420" width="1600" height="480" fill="url(#fload-horizon)" />
          <path className="fload__earth" d="M -100 860 Q 800 770 1700 860 L 1700 1000 L -100 1000 Z" />
          <path className="fload__earth-rim" d="M -100 860 Q 800 770 1700 860" />
          {Array.from({ length: 46 }, (_, i) => {
            const x = 60 + i * 34 + ((i * 13) % 11);
            const y = 850 - Math.sin((x / 1600) * Math.PI) * 78 + ((i * 7) % 9);
            return <circle key={i} className="fload__city" cx={x} cy={y} r={(i % 3) * 0.6 + 1} style={{ animationDelay: `${(i % 7) * 0.3}s` }} />;
          })}

          {/* Runway lights where the climb begins */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <circle key={i} className="fload__runway" cx={flight.runway - 150 + i * 22} cy={800 - i * 1.2} r="3" style={{ animationDelay: `${i * 90}ms` }} />
          ))}

          {/* The route ahead, the route flown, and cruise */}
          <path ref={routeRef} className="fload__route" d={flight.route} pathLength="1" />
          <path ref={flownRef} className="fload__flown" d={flight.route} pathLength="1" style={{ strokeDasharray: `${p} 1` }} />
          <g className="fload__cruise-mark">
            <circle cx={cx} cy={cy} r="10" />
            <circle cx={cx} cy={cy} r="22" className="fload__cruise-ring" style={{ transformOrigin: `${cx}px ${cy}px` }} />
          </g>

          {/* The aircraft, nose to the right so rotating it follows the route */}
          <g ref={planeRef} className="fload__plane">
            <circle className="fload__plane-glow" r="46" />
            <g transform="scale(2.6)">
              <path d="M13 0 L-5 -2.2 L-9 -11 L-12 -11 L-9 -2 L-13 -1.6 L-15 -5 L-17 -5 L-15.5 0 L-17 5 L-15 5 L-13 1.6 L-9 2 L-12 11 L-9 11 L-5 2.2 Z" />
              <circle className="fload__beacon" cx="-9" cy="-11" r="1.1" />
            </g>
          </g>
        </svg>

        <div className="fload__clouds fload__clouds--near" />
        <div className="fload__vignette" />
      </div>

      <div className="fload__brand" aria-hidden="true">
        <Logo size={30} />
        <span>PathSeeker</span>
      </div>

      <div className="fload__hud">
        <div className="fload__hud-left">
          <span className="fload__status">
            <span className="fload__dot" />
            {atCruise ? 'Cruising altitude' : 'Climbing'}
          </span>
          <span className="fload__label">{label}</span>
        </div>
        <div className="fload__bar" aria-hidden="true"><span ref={barRef} style={{ transform: `scaleX(${p})` }} /></div>
        <div className="fload__alt">
          <span className="fload__alt-n" ref={altRef}>{feet.toLocaleString('en-US')}</span>
          <span className="fload__alt-u">ft</span>
        </div>
      </div>
    </div>
  );

  // Rendered into <body>. Pages drop the loader inside their own markup, and
  // any ancestor with a transform, filter or contain would otherwise become
  // the box a fixed element is positioned against, shrinking the sky to it.
  return typeof document !== 'undefined' ? createPortal(screen, document.body) : screen;
}

/**
 * Holds a page's own loading state open until the climb has finished.
 *
 * The point of the loader is the arrival: cutting it off mid-climb the
 * instant the data lands wastes the one beat that made it worth showing.
 * Pages here are written as an early return — `if (loading) return <loader/>`
 * — so this keeps that shape rather than asking every page to restructure
 * around a wrapper:
 *
 *     const { held, landing } = useLanding(loading);
 *     if (held) return <FlightLoader label="…" {...landing} />;
 *
 * `held` stays true after `loading` goes false, until the bar reaches cruise.
 * It is only ever cleared, never re-set: a page that flips its own loading
 * back on — a refetch, a filter change — must not drop the reader onto a
 * runway they have already flown.
 */
export function useLanding(loading) {
  const [cleared, setCleared] = useState(!loading);
  return {
    held: !cleared,
    landing: { done: !loading, onComplete: () => setCleared(true) },
  };
}
