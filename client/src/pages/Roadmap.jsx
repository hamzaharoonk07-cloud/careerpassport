import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { quizService } from '../services/quiz.service.js';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { useJourney } from '../context/JourneyContext.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { FlightLoader, useLanding } from '../components/brand/FlightLoader.jsx';
import { DemandMeter, salaryBand } from '../components/brand/DepartureBoard.jsx';
import '../styles/quiz.css';
import '../styles/airport.css';
import '../styles/roadmap.css';

/* ── Route geometry ──────────────────────────────────────────────
   One quadratic curve across the chart. Waypoints sit at even steps of t,
   and the flown part is the same curve split at the current waypoint
   (de Casteljau), so the gold line always ends exactly under the plane. */
const P0 = { x: 70, y: 210 };
const P1 = { x: 500, y: -40 };
const P2 = { x: 930, y: 210 };

const at = (t) => ({
  x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * P1.x + t ** 2 * P2.x,
  y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * P1.y + t ** 2 * P2.y,
});
const angleAt = (t) => {
  const dx = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
  const dy = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};
const flownPath = (t) => {
  const c = { x: (1 - t) * P0.x + t * P1.x, y: (1 - t) * P0.y + t * P1.y };
  const e = at(t);
  return `M${P0.x},${P0.y} Q${c.x},${c.y} ${e.x},${e.y}`;
};

const storeKey = (slug) => `pathseeker.roadmap.${slug}`;
const readDone = (slug) => {
  try { return new Set(JSON.parse(localStorage.getItem(storeKey(slug)) || '[]')); } catch { return new Set(); }
};

function RouteChart({ stages, done, current, destination, onPick }) {
  const n = stages.length;
  // Legs 0..n-1 sit at t = (i + 1) / (n + 1), leaving the ends for origin and destination.
  const tFor = (i) => (i + 1) / (n + 1);
  // The plane waits at the last waypoint flown in order, or just off the
  // origin before the first one, and lands on the destination at the end.
  const tPlane = current >= n ? 1 : current === 0 ? 0.03 : tFor(current - 1);
  const plane = at(tPlane);

  // On a narrow screen the chart scrolls sideways; keep the plane in view.
  const box = useRef(null);
  useEffect(() => {
    const el = box.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: (plane.x / 1000) * el.scrollWidth - el.clientWidth / 2, behavior: 'smooth' });
  }, [plane.x]);

  return (
    <div className="rchart" ref={box}>
      <svg className="rchart__svg" viewBox="0 0 1000 300" role="img" aria-label={`Route with ${n} legs, ${done.size} flown`}>
        <path className="rchart__route" d={`M${P0.x},${P0.y} Q${P1.x},${P1.y} ${P2.x},${P2.y}`} />
        {tPlane > 0.03 && <path className="rchart__flown" d={flownPath(tPlane)} />}

        <g className="rchart__end">
          <circle cx={P0.x} cy={P0.y} r="9" />
          <text x={P0.x} y={P0.y + 40} textAnchor="middle">You</text>
        </g>
        <g className={`rchart__end rchart__end--to ${current >= n ? 'is-arrived' : ''}`}>
          <circle cx={P2.x} cy={P2.y} r="11" />
          <text x={P2.x} y={P2.y + 40} textAnchor="middle">{destination}</text>
        </g>

        {stages.map((s, i) => {
          const p = at(tFor(i));
          const state = done.has(s.stage) ? 'done' : i === current ? 'now' : 'next';
          return (
            <g
              key={s.stage}
              className={`rchart__wp rchart__wp--${state}`}
              onClick={() => onPick(i)}
              role="button"
              tabIndex={0}
              aria-label={`Leg ${i + 1}, ${s.title}${state === 'done' ? ', flown' : ''}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(i); } }}
            >
              <circle className="rchart__hit" cx={p.x} cy={p.y} r="26" />
              <circle className="rchart__node" cx={p.x} cy={p.y} r="14" />
              <text className="rchart__n" x={p.x} y={p.y + 5} textAnchor="middle">{state === 'done' ? '✓' : i + 1}</text>
              <text className="rchart__label" x={p.x} y={p.y - 26} textAnchor="middle">{s.title}</text>
            </g>
          );
        })}

        <g transform={`translate(${plane.x} ${plane.y}) rotate(${angleAt(tPlane)})`} className="rchart__plane">
          <path d="M14 0 L-8 -9 L-4 0 L-8 9 Z" />
        </g>
      </svg>
    </div>
  );
}

/**
 * The flight plan: six legs between the traveller and a career.
 *
 * ?career=<slug> follows the gate that was chosen; without it, the quiz's top
 * match. Every word of the legs comes from the Career document. Which legs a
 * traveller has marked as flown is a personal note kept in this browser.
 */
export default function Roadmap() {
  const { advance } = useJourney();
  const [params] = useSearchParams();
  const chosenSlug = params.get('career');
  const [career, setCareer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(new Set());
  const [open, setOpen] = useState(null);

  useEffect(() => {
    advance('roadmap');
    let alive = true;
    const load = chosenSlug
      ? careerService.get(chosenSlug)
      : quizService.latestResult().then((r) => r?.matches?.[0]?.career || null);
    load
      .then((c) => {
        if (!alive) return;
        setCareer(c);
        if (c?.slug) setDone(readDone(c.slug));
      })
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [advance, chosenSlug]);

  const stages = useMemo(() => career?.roadmap || [], [career]);
  const current = useMemo(() => {
    const i = stages.findIndex((s) => !done.has(s.stage));
    return i === -1 ? stages.length : i;
  }, [stages, done]);

  const toggle = (stage) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage); else next.add(stage);
      try { localStorage.setItem(storeKey(career.slug), JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const pick = (i) => {
    setOpen(i);
    document.getElementById(`leg-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Hold the loader until its climb resolves, then show the page.
  const { held, landing } = useLanding(loading);
  if (held) {
    return <main className="rm rmap"><div className="center-screen"><FlightLoader label="Plotting your route" {...landing} /></div></main>;
  }

  if (error || !career) {
    return (
      <main className="rm rmap">
        <div className="center-screen wrap-narrow" style={{ textAlign: 'center' }}>
          <div>
            <h1 className="t-h2">No roadmap yet</h1>
            <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
              {error || 'Choose a career at the gates, or take the quiz, and its route is plotted here.'}
            </p>
            <div style={{ marginTop: 'var(--sp-6)' }}><Button to="/interests">Choose your field</Button></div>
          </div>
        </div>
      </main>
    );
  }

  const flown = done.size;
  const arrived = current >= stages.length;
  const pay = salaryBand(career.salary);

  return (
    <main className="rm rmap">
      <SceneVideo src="/videos/cruise.mp4" poster="/images/cruise.jpg" loop />

      <div className="wrap rmap__inner">
        <header className="rmap__head">
          <div>
            <p className="rmap__kicker">Flight plan · {career.field?.name}</p>
            <h1 className="rmap__title">Your route to {career.title}</h1>
            <p className="rmap__lead">
              {stages.length} legs between here and the destination. Mark each one as you finish
              it and the plane moves along the route.
            </p>
          </div>
          <dl className="rmap__stats">
            <div className="rmap__stat rmap__stat--big">
              <dt>Legs flown</dt>
              <dd><b>{flown}</b> of {stages.length}</dd>
              <span className="rmap__progress"><span style={{ width: `${(flown / Math.max(1, stages.length)) * 100}%` }} /></span>
            </div>
            <div className="rmap__stat"><dt>Demand</dt><dd><DemandMeter level={career.demand?.level} /></dd></div>
            <div className="rmap__stat"><dt>Salary / month</dt><dd>{pay || 'Not available'}</dd></div>
          </dl>
        </header>

        <section className="rmap__chart" aria-label="Route chart">
          <div className="rmap__chart-head">
            <span className={`rmap__status ${arrived ? 'rmap__status--arrived' : ''}`}>
              {arrived ? 'Arrived' : `Now flying: leg ${current + 1}, ${stages[current].title}`}
            </span>
            <span className="rmap__hint">Tap a waypoint to jump to that leg</span>
            <span className="rmap__swipe">Swipe to see the whole route</span>
          </div>
          <RouteChart
            stages={stages}
            done={done}
            current={current}
            destination={career.title}
            onPick={pick}
          />
        </section>

        <div className="rmap__body">
          <ol className="rlegs">
            {stages.map((s, i) => {
              const isDone = done.has(s.stage);
              const isNow = i === current;
              const expanded = isNow || open === i;
              return (
                <li
                  key={s.stage}
                  id={`leg-${i}`}
                  className={`rleg ${isDone ? 'rleg--done' : ''} ${isNow ? 'rleg--now' : ''} ${expanded ? 'rleg--open' : ''}`}
                >
                  <span className="rleg__rail" aria-hidden="true">
                    <span className="rleg__node">{isDone ? '✓' : i + 1}</span>
                  </span>
                  <div className="rleg__card">
                    <button
                      type="button"
                      className="rleg__head"
                      onClick={() => setOpen(open === i ? null : i)}
                      aria-expanded={expanded}
                    >
                      <span className="rleg__meta">
                        Leg {i + 1}
                        {isNow && <span className="rleg__tag">Current leg</span>}
                        {isDone && <span className="rleg__tag rleg__tag--done">Flown</span>}
                      </span>
                      <span className="rleg__title">{s.title}</span>
                    </button>
                    {expanded && (
                      <div className="rleg__more">
                        <p className="rleg__detail">{s.detail}</p>
                        <button
                          type="button"
                          className={`rleg__toggle ${isDone ? 'rleg__toggle--done' : ''}`}
                          onClick={() => toggle(s.stage)}
                          aria-pressed={isDone}
                        >
                          {isDone ? 'Mark as not done' : 'Mark leg as done'}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <aside className="rmap__side">
            <section className="rpack">
              <h2 className="rpack__title">Pack for the trip</h2>
              {career.learningAreas?.length > 0 && (
                <>
                  <h3 className="rpack__k">Learn first</h3>
                  <ul className="rpack__list">
                    {career.learningAreas.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </>
              )}
              {career.skills?.length > 0 && (
                <>
                  <h3 className="rpack__k">Skills the job asks for</h3>
                  <div className="rpack__chips">
                    {career.skills.map((sk) => (
                      <span key={sk.name} className={sk.weight >= 5 ? 'is-core' : ''}>{sk.name}</span>
                    ))}
                  </div>
                </>
              )}
              <div className="rpack__actions">
                <Button to={`/result?career=${career.slug}`}>Read the report</Button>
                <Button variant="ghost" to="/airport">Back to the gates</Button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
