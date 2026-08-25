import { useEffect, useMemo, useRef, useState } from 'react';
import { SceneVideo } from '../media/SceneVideo.jsx';
import { BoardingPass } from './BoardingPass.jsx';
import { gateCode } from './DepartureBoard.jsx';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import '../../styles/airport.css';

/**
 * Six beats, each with its own footage.
 *
 * `hold` is how long a beat stays on screen; the whole flight is about
 * twenty-two seconds and every beat is skippable. `alt` values 0–1 drive the
 * HUD readouts, so altitude and speed climb through takeoff, hold through
 * cruise and fall through the approach — the instruments tell the same story
 * as the picture instead of running arbitrary numbers.
 */
const BEATS = [
  {
    key: 'gate',
    src: '/videos/gate.mp4',
    poster: '/images/gate.jpg',
    hold: 3200,
    stage: 'At the gate',
    line: (c) => `Destination confirmed — ${c?.title}`,
    alt: 0,
    spd: 0,
  },
  {
    key: 'boarding',
    src: '/videos/boarding.mp4',
    poster: '/images/boarding.jpg',
    hold: 3200,
    stage: 'Boarding',
    line: () => 'Boarding pass accepted',
    alt: 0,
    spd: 0.04,
  },
  {
    key: 'cabin',
    src: '/videos/cabin.mp4',
    poster: '/images/cabin.jpg',
    hold: 3400,
    stage: 'On board',
    line: () => 'Find your seat. Doors closing.',
    alt: 0.02,
    spd: 0.12,
  },
  {
    key: 'takeoff',
    src: '/videos/takeoff.mp4',
    poster: '/images/takeoff.jpg',
    hold: 3800,
    stage: 'Departure',
    line: () => 'Taking off towards your future',
    alt: 0.55,
    spd: 0.86,
  },
  {
    key: 'cruise',
    src: '/videos/cruise.mp4',
    poster: '/images/cruise.jpg',
    hold: 4000,
    stage: 'En route',
    line: () => 'Flying to your dream destination',
    alt: 1,
    spd: 1,
  },
  {
    key: 'arrival',
    src: '/videos/arrival.mp4',
    poster: '/images/arrival.jpg',
    hold: 4200,
    stage: 'Arrival',
    line: (c) => `Welcome to ${c?.title}`,
    alt: 0.05,
    spd: 0.2,
  },
];

const MAX_ALT = 38000;   // feet
const MAX_SPD = 560;     // knots

/** Eases a displayed number toward its target so the HUD never jumps. */
function useGauge(target, { rate = 2.4 } = {}) {
  const [value, setValue] = useState(target);
  const raf = useRef(null);
  const current = useRef(target);

  useEffect(() => {
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current.current += (target - current.current) * Math.min(1, rate * dt);
      setValue(current.current);
      if (Math.abs(target - current.current) > 0.001) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, rate]);

  return value;
}

export function FlightSequence({ user, career, index = 0, onArrive, onSkip }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const timers = useRef([]);

  const beat = BEATS[step];
  const alt = useGauge(beat.alt);
  const spd = useGauge(beat.spd);
  const progress = ((step + 1) / BEATS.length) * 100;

  useEffect(() => {
    if (reduced) { onArrive?.(); return undefined; }

    let elapsed = 0;
    BEATS.forEach((b, i) => {
      if (i === 0) return;
      elapsed += BEATS[i - 1].hold;
      timers.current.push(setTimeout(() => setStep(i), elapsed));
    });
    timers.current.push(setTimeout(() => onArrive?.(), elapsed + BEATS[BEATS.length - 1].hold));

    return () => timers.current.forEach(clearTimeout);
  }, [reduced, onArrive]);

  const fmt = (n) => Math.round(n).toLocaleString('en-GB');

  return (
    <div className={`flight ${step <= 1 ? 'flight--pass' : ''}`} role="status" aria-live="polite">
      {/* Each beat brings its own clip; the gradient underneath keeps the
          sequence intact if a file is ever missing. */}
      <SceneVideo key={beat.key} src={beat.src} poster={beat.poster} loop>
        <div className="flight__void" />
      </SceneVideo>

      {/* Faint instrument grid over the footage */}
      <div className="flight__grid" aria-hidden="true" />

      {/* The pass, torn as it is accepted at the gate */}
      {step <= 1 && (
        <div className="flight__pass">
          <BoardingPass user={user} career={career} index={index} issued torn={step === 1} />
        </div>
      )}

      {/* Flight HUD */}
      <div className="hud" aria-hidden="true">
        <div className="hud__row">
          <span className="hud__k">Flight</span>
          <span className="hud__v">PS{String(100 + index * 7).slice(0, 3)}</span>
        </div>
        <div className="hud__row">
          <span className="hud__k">Gate</span>
          <span className="hud__v">{gateCode(index)}</span>
        </div>
        <div className="hud__row">
          <span className="hud__k">Altitude</span>
          <span className="hud__v">{fmt(alt * MAX_ALT)} ft</span>
        </div>
        <div className="hud__row">
          <span className="hud__k">Ground speed</span>
          <span className="hud__v">{fmt(spd * MAX_SPD)} kt</span>
        </div>
        <div className="hud__bar">
          <span className="hud__bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flight__caption">
        <p className="flight__stage">{beat.stage}</p>
        <p className="flight__line" key={beat.key}>{beat.line(career)}</p>
      </div>

      <div className="flight__track" aria-hidden="true">
        {BEATS.map((b, i) => (
          <span key={b.key} className={`flight__dot ${i <= step ? 'flight__dot--on' : ''}`} />
        ))}
      </div>

      <button type="button" className="flight__skip" onClick={onSkip || onArrive}>
        Skip to arrival →
      </button>
    </div>
  );
}
