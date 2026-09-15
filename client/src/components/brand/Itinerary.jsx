import '../../styles/terminal.css';

/**
 * The journey as a flight path: passport, field, gate, report.
 *
 * It is a real sequence, so it is drawn as one — a route with the aircraft
 * sitting on the leg the traveller is on. `current` is the index of that leg;
 * everything before it is flown, everything after is still ahead.
 */
export const JOURNEY = ['Passport', 'Field', 'Gate', 'Report'];

export function Itinerary({ current = 0, steps = JOURNEY, className = '' }) {
  const p = steps.length > 1 ? Math.min(current, steps.length - 1) / (steps.length - 1) : 0;
  return (
    <ol
      className={`itin ${className}`}
      style={{ '--itin-p': p }}
      aria-label={`Journey: step ${Math.min(current, steps.length - 1) + 1} of ${steps.length}, ${steps[Math.min(current, steps.length - 1)]}`}
    >
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next';
        return (
          <li key={label} className={`itin__stop itin__stop--${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="itin__node" aria-hidden="true">
              {state === 'now' ? (
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" transform="rotate(90 12 12)" /></svg>
              ) : state === 'done' ? (
                <svg viewBox="0 0 24 24" width="12" height="12"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              ) : null}
            </span>
            <span className="itin__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
