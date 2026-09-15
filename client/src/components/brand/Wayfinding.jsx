import { Link } from 'react-router-dom';
import '../../styles/terminal.css';

/**
 * Terminal signage: the overhead sign you follow through an airport.
 *
 * Black panel, gold pictogram tiles, an arrow for which way each thing is.
 * Down points at something further down this page, right leaves it.
 */
const PICTOS = {
  departures: <path d="M3 18.5h18M4.5 14.2l3.1 1.2 4.9-2.1 6.7-2.9a1.6 1.6 0 0 0-1.2-3l-3.8 1.6-5.8-3.3-1.8.8 3.6 4-3.3 1.4-2.4-1.3-1.4.6z" />,
  pass: (
    <>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" />
      <path d="M15 6v12" strokeDasharray="2 2" />
    </>
  ),
  change: <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />,
  lounge: (
    <>
      <path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11" />
      <path d="M3.5 11.5A1.5 1.5 0 0 1 6.5 12v2h11v-2a1.5 1.5 0 0 1 3 0V17h-17zM6 17v2M18 17v2" />
    </>
  ),
  report: (
    <>
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5v4h4M9.5 12h6M9.5 15.5h6" />
    </>
  ),
};

const ARROWS = {
  down: 'M12 4v16m0 0-6-6m6 6 6-6',
  right: 'M4 12h16m0 0-6-6m6 6-6 6',
  left: 'M20 12H4m0 0 6-6m-6 6 6 6',
  up: 'M12 20V4m0 0-6 6m6-6 6 6',
};

function Sign({ picto, title, detail, arrow }) {
  return (
    <>
      <span className="wayf__picto">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {PICTOS[picto]}
        </svg>
      </span>
      <span className="wayf__text">
        <span className="wayf__title">{title}</span>
        {detail && <span className="wayf__detail">{detail}</span>}
      </span>
      <svg className="wayf__arrow" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ARROWS[arrow]} />
      </svg>
    </>
  );
}

export function Wayfinding({ signs, label = 'Terminal directions' }) {
  return (
    <nav className="wayf" aria-label={label}>
      {signs.map((s) =>
        s.to ? (
          <Link key={s.title} to={s.to} className="wayf__sign"><Sign {...s} /></Link>
        ) : (
          <button key={s.title} type="button" className="wayf__sign" onClick={s.onClick} disabled={s.disabled}>
            <Sign {...s} />
          </button>
        )
      )}
    </nav>
  );
}
