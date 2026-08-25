import { gateCode } from './DepartureBoard.jsx';
import { Logo } from './Logo.jsx';
import '../../styles/airport.css';

/**
 * The boarding pass, issued when a destination is chosen.
 *
 * Everything printed on it is real: the passenger's own name and passport
 * number, the gate generated from the career's position on the board, and the
 * destination they actually selected. Nothing here is decorative filler.
 */
export function BoardingPass({ user, career, index = 0, issued = false, torn = false }) {
  if (!career) return null;

  const seat = `${String((index % 30) + 1).padStart(2, '0')}${'ABCDEF'[index % 6]}`;
  const flight = `PS${String(100 + index * 7).slice(0, 3)}`;
  const now = new Date();
  const boards = new Date(now.getTime() + 25 * 60000);
  const hhmm = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`bpass ${issued ? 'bpass--issued' : ''} ${torn ? 'bpass--torn' : ''}`}
      role="img"
      aria-label={`Boarding pass to ${career.title}${torn ? ', torn at the gate' : ''}`}
    >
      <div className="bpass__main">
        {/* Stamped on by the gate as the stub is taken. */}
        <span className="bpass__cleared" aria-hidden="true">CLEARED</span>

        <div className="bpass__head">
          <span className="bpass__mark"><Logo size={24} /></span>
          <span className="bpass__brand">PASS SEEKER</span>
          <span className="bpass__type t-mono">BOARDING PASS</span>
        </div>

        <div className="bpass__route">
          <div className="bpass__end">
            <span className="bpass__code t-mono">KHI</span>
            <span className="bpass__place">Where you are</span>
          </div>
          <div className="bpass__path" aria-hidden="true">
            <span className="bpass__line" />
            <span className="bpass__jet">✈</span>
            <span className="bpass__line" />
          </div>
          <div className="bpass__end bpass__end--to">
            <span className="bpass__code t-mono">{gateCode(index)}</span>
            <span className="bpass__place">{career.title}</span>
          </div>
        </div>

        <dl className="bpass__grid">
          <div><dt>Passenger</dt><dd>{user?.name || '—'}</dd></div>
          <div><dt>Passport</dt><dd className="t-mono">{user?.passportNumber || '—'}</dd></div>
          <div><dt>Flight</dt><dd className="t-mono">{flight}</dd></div>
          <div><dt>Gate</dt><dd className="t-mono">{gateCode(index)}</dd></div>
          <div><dt>Seat</dt><dd className="t-mono">{seat}</dd></div>
          <div><dt>Boards</dt><dd className="t-mono">{hhmm(boards)}</dd></div>
        </dl>
      </div>

      <div className="bpass__stub">
        <span className="bpass__stub-code t-mono">{gateCode(index)}</span>
        <span className="bpass__stub-name">{career.title}</span>
        <span className="bpass__barcode" aria-hidden="true" />
        <span className="bpass__stub-seat t-mono">{seat}</span>
      </div>
    </div>
  );
}
