import { useEffect, useMemo, useState } from 'react';
import { FieldIcon } from './FieldIcon.jsx';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import '../../styles/airport.css';

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

/**
 * The departures board.
 *
 * Every row is a career from the database. Selecting one is selecting a
 * destination — the flight sequence and the destination page both take it
 * from here.
 */
export function DepartureBoard({
  careers,
  onSelect,
  selectedSlug = null,
  boarding = false,
  page = 0,
  onPageChange,
}) {
  const pages = Math.max(1, Math.ceil(careers.length / PER_BOARD));
  const slice = useMemo(
    () => careers.slice(page * PER_BOARD, page * PER_BOARD + PER_BOARD),
    [careers, page]
  );

  return (
    <div className="board3">
      <div className="board3__head">
        <span className="board3__plane" aria-hidden="true">✈</span>
        <h2 className="board3__title">Departures</h2>
        <span className="board3__clock t-mono">
          {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="board3__cols" aria-hidden="true">
        <span>Gate</span>
        <span>Career destination</span>
        <span className="board3__col-desc">Description</span>
        <span>Status</span>
      </div>

      <ul className="board3__rows">
        {slice.map((c, i) => {
          const index = page * PER_BOARD + i;
          const on = selectedSlug === c.slug;
          return (
            <li key={c._id || c.slug}>
              <button
                type="button"
                className={`row3 ${on ? 'row3--on' : ''} ${selectedSlug && !on ? 'row3--dim' : ''}`}
                onClick={() => onSelect?.(c, index)}
                disabled={boarding}
                aria-pressed={on}
              >
                <span className="row3__gate t-mono">
                  <FlapText text={gateCode(index)} delay={i * 60} />
                </span>

                <span className="row3__dest">
                  <span className="row3__icon">
                    <FieldIcon name={c.field?.icon || 'briefcase'} size={17} />
                  </span>
                  {c.title}
                </span>

                <span className="row3__desc">{c.summary}</span>

                <span className={`row3__status ${on ? 'row3__status--now' : ''}`}>
                  {on && boarding ? 'BOARDING' : on ? 'SELECTED' : 'ON TIME'}
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
          <span className="t-mono board3__pagenum">
            Board {page + 1} of {pages} · {careers.length} destinations
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
