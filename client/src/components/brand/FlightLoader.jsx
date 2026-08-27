import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import './FlightLoader.css';

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
      const pct = `${pos * 100}%`;
      if (flownRef.current) flownRef.current.style.width = pct;
      if (planeRef.current) planeRef.current.style.left = pct;

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

  // Rounded to the nearest hundred feet: an altimeter that changed by single
  // feet sixty times a second would be noise, not a readout.
  const feet = Math.round((p * CRUISE_FT) / 100) * 100;
  const pct = Math.round(p * 100);
  const atCruise = p >= 0.999;

  return (
    <div
      className={`fload ${atCruise ? 'fload--cruise' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? pct : undefined}
      aria-valuetext={`${label} — ${feet.toLocaleString('en-US')} feet`}
      aria-label={label}
    >
      <p className="fload__label">{atCruise ? 'Cruising altitude' : label}</p>

      <div className="fload__track">
        <span className="fload__path" />
        <span className="fload__flown" ref={flownRef} style={{ width: `${p * 100}%` }} />
        {/* The plane rides the head of the flown segment. `left` is a
            percentage of the track and the translate re-centres it, so it
            stays on the line at both ends instead of overhanging them. */}
        <span className="fload__plane" ref={planeRef} style={{ left: `${p * 100}%` }} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M21 14.5 13.5 12V5.5a1.5 1.5 0 0 0-3 0V12L3 14.5v2l7.5-2v4L8 20.5V22l4-1.2 4 1.2v-1.5L13.5 18.5v-4l7.5 2z" />
          </svg>
        </span>
      </div>

      <p className="fload__alt">
        <span className="fload__alt-n" ref={altRef}>{feet.toLocaleString('en-US')}</span>
        <span className="fload__alt-u">ft</span>
      </p>
    </div>
  );
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
