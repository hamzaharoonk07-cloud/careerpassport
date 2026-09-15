import { useEffect, useMemo, useState } from 'react';
import { FieldIcon } from './FieldIcon.jsx';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import '../../styles/airport.css';
import '../../styles/flights.css';

/** Rows on one face of the board, the way a real departures screen paginates. */
const PER_BOARD = 8;

/**
 * Gate codes are generated, never stored.
 *
 * Eight careers fill A1–A8; the ninth starts B1. Thirty-eight careers produce
 * thirty-eight gates without anything in the database knowing what a gate is,
 * which is the whole point of "dynamic gates, no hardcoding" — the board
 * follows the data rather than the data being bent to fit the board.
 */
export function gateCode(index) {
  const letter = String.fromCharCode(65 + Math.floor(index / PER_BOARD));
  return `${letter}${(index % PER_BOARD) + 1}`;
}

/** Split-flap character. Settles on its final letter after a short shuffle. */
function Flap({ char, delay }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? char : ' ');

  useEffect(() => {
    if (reduced) { setShown(char); return undefined; }
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ticks = 0;
    let timer;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        ticks += 1;
        if (ticks > 6) {
          setShown(char);
          clearInterval(timer);
        } else {
          setShown(glyphs[Math.floor(Math.random() * glyphs.length)]);
        }
      }, 45);
    }, delay);
    return () => { clearTimeout(start); clearInterval(timer); };
  }, [char, delay, reduced]);

  return <span className="flap" aria-hidden="true">{shown === ' ' ? ' ' : shown}</span>;
}

function FlapText({ text, delay = 0 }) {
  return (
    <span className="flaps" aria-label={text}>
      {text.split('').map((c, i) => (
        <Flap key={`${c}-${i}`} char={c} delay={delay + i * 38} />
      ))}
    </span>
  );
}

/** Salary band in the width a board row has: "PKR 95k – 550k". */
export function salaryBand(salary) {
  if (!salary || (salary.entry == null && salary.senior == null)) return null;
  const k = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const lo = salary.entry ?? salary.senior;
  const hi = salary.senior ?? salary.entry;
  return `${salary.currency || 'PKR'} ${k(lo)}${hi !== lo ? ` – ${k(hi)}` : ''}`;
}

export const DEMAND = {
  low: { label: 'Low', bars: 1 },
  moderate: { label: 'Moderate', bars: 2 },
  high: { label: 'High', bars: 3 },
  'very-high': { label: 'Very high', bars: 4 },
};

/** Four signal bars, filled to the demand level. The word sits beside it, so it never relies on the bars alone. */
export function DemandMeter({ level }) {
  const d = DEMAND[level];
  if (!d) return <span className="fl-none">No data</span>;
  return (
    <span className="fl-demand">
      <span className="fl-demand__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => <i key={n} className={n <= d.bars ? 'on' : ''} style={{ height: `${4 + n * 3}px` }} />)}
      </span>
      <span>{d.label}</span>
    </span>
  );
}

/**
 * The departures board.
 *
 * Every row is a career from the database, printed with what a traveller
 * needs to choose between them: where it goes, how much demand there is,
 * what it pays, and, once the quiz is done, how well it fits them.
 * `scores` maps career slug to match percentage; careers outside the stored
 * top matches show no figure rather than an invented one.
 */
export function DepartureBoard({
  careers,
  onSelect,
  selectedSlug = null,
  boarding = false,
  page = 0,
  onPageChange,
  scores = null,
}) {
  const pages = Math.max(1, Math.ceil(careers.length / PER_BOARD));
  const slice = useMemo(
    () => careers.slice(page * PER_BOARD, page * PER_BOARD + PER_BOARD),
    [careers, page]
  );
  const best = useMemo(() => {
    if (!scores || !scores.size) return null;
    let top = null;
    for (const c of careers) {
      const v = scores.get(c.slug);
      if (v != null && (top === null || v > scores.get(top))) top = c.slug;
    }
    return top;
  }, [careers, scores]);

  return (
    <div className="board3 fl-board">
      <div className="board3__head">
        <span className="board3__plane" aria-hidden="true">✈</span>
        <h2 className="board3__title">Departures</h2>
        <span className="fl-board__count">{careers.length} destinations</span>
        <span className="board3__clock t-mono">
          {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="fl-cols" aria-hidden="true">
        <span>Gate</span>
        <span>Destination</span>
        <span>Demand</span>
        <span>Salary / month</span>
        <span>Your match</span>
        <span />
      </div>

      <ul className="board3__rows">
        {slice.map((c, i) => {
          const index = page * PER_BOARD + i;
          const on = selectedSlug === c.slug;
          const score = scores?.get(c.slug);
          const pay = salaryBand(c.salary);
          return (
            <li key={c._id || c.slug}>
              <button
                type="button"
                className={`fl-row ${on ? 'fl-row--on' : ''} ${selectedSlug && !on ? 'fl-row--dim' : ''}`}
                style={{ '--accent': c.field?.accent || 'var(--gold-500)' }}
                onClick={() => onSelect?.(c, index)}
                disabled={boarding}
                aria-pressed={on}
              >
                <span className="fl-gate">
                  <FlapText text={gateCode(index)} delay={i * 60} />
                </span>

                <span className="fl-dest">
                  <span className="fl-dest__icon">
                    <FieldIcon name={c.field?.icon || 'briefcase'} size={20} />
                  </span>
                  <span className="fl-dest__text">
                    <span className="fl-dest__title">
                      {c.title}
                      {best === c.slug && <span className="fl-best">Best match</span>}
                    </span>
                    <span className="fl-dest__sum">{c.summary}</span>
                  </span>
                </span>

                <span className="fl-cell" data-k="Demand"><DemandMeter level={c.demand?.level} /></span>

                <span className="fl-cell" data-k="Salary">
                  {pay ? <span className="fl-pay">{pay}</span> : <span className="fl-none">Not available</span>}
                </span>

                <span className={`fl-cell ${score == null ? 'fl-cell--empty' : ''}`} data-k="Match">
                  {score != null ? (
                    <span className="fl-match">
                      <span className="fl-match__track"><span style={{ width: `${score}%` }} /></span>
                      <b>{score}%</b>
                    </span>
                  ) : <span className="fl-none">—</span>}
                </span>

                <span className={`fl-action ${on ? 'fl-action--on' : ''}`}>
                  {on && boarding ? 'Boarding' : on ? 'Selected' : 'Select'}
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    {on
                      ? <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
                      : <path fill="currentColor" d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" transform="rotate(90 12 12)" />}
                  </svg>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <div className="board3__pager">
          <button
            type="button"
            className="board3__pagebtn"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 0 || boarding}
          >
            ← Previous
          </button>
          <span className="fl-dots">
            {Array.from({ length: pages }, (_, n) => (
              <button
                key={n}
                type="button"
                className={`fl-dot ${n === page ? 'fl-dot--on' : ''}`}
                onClick={() => onPageChange?.(n)}
                aria-label={`Board ${n + 1} of ${pages}`}
                aria-current={n === page ? 'true' : undefined}
                disabled={boarding}
              />
            ))}
          </span>
          <button
            type="button"
            className="board3__pagebtn"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= pages - 1 || boarding}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
