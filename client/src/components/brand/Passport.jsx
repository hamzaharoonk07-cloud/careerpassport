import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTypewriter } from '../../hooks/useTypewriter.js';
import { PassportEmblem, ChipMark } from './PassportEmblem.jsx';
import { EntryStamp } from './EntryStamp.jsx';
import '../../styles/passport-view.css';

const AXIS = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
const AXIS_NOTE = {
  R: 'Building and working with real things',
  I: 'Analysing problems and finding out why',
  A: 'Creating original work',
  S: 'Working with and for people',
  E: 'Leading and owning outcomes',
  C: 'Precision and structure',
};
const CLASS = { student: 'Student', graduate: 'Graduate', professional: 'Professional' };

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() : null;

/** A machine-readable zone built from the holder's real details. */
function mrz(user) {
  const name = (user?.name || 'TRAVELLER').trim().toUpperCase().replace(/[^A-Z ]/g, '').replace(/\s+/g, '<');
  const number = (user?.passportNumber || 'PS').replace(/-/g, '');
  const d = user?.createdAt ? new Date(user.createdAt) : new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return [
    `P<PSK${name}`.padEnd(44, '<').slice(0, 44),
    `${number}<PSK${stamp}`.padEnd(44, '<').slice(0, 44),
  ];
}

function Row({ label, value, empty = 'Not recorded', mono = false, wide = false }) {
  return (
    <div className={`pv-row ${wide ? 'pv-row--wide' : ''}`}>
      <dt>{label}</dt>
      <dd className={`${mono ? 'is-mono' : ''} ${value ? '' : 'is-empty'}`}>{value || empty}</dd>
    </div>
  );
}

/* ── Left page: the data page ────────────────────────────── */
function DataPage({ user, field, typing, stamped }) {
  const { shown, done } = useTypewriter(user?.name || '', { animate: typing });
  const [l1, l2] = mrz(user);
  return (
    <div className="pv-page pv-page--data">
      <header className="pv-page__head">
        <span className="pv-emblem"><PassportEmblem size={40} ring="PATHSEEKER · PATHSEEKER · " /></span>
        <span className="pv-page__names">
          <span className="pv-page__kicker">PathSeeker Career Authority</span>
          <span className="pv-page__title">Career Passport</span>
        </span>
        <span className="pv-type">P · PSK</span>
      </header>

      <div className="pv-identity">
        <div className="pv-photo" aria-hidden="true">
          <span>{(user?.name || '?').trim().charAt(0).toUpperCase()}</span>
          <ChipMark size={12} />
        </div>
        <dl className="pv-fields">
          <div className="pv-row pv-row--wide pv-row--name">
            <dt>Holder</dt>
            <dd>{shown}{!done && <span className="pv-caret" aria-hidden="true" />}</dd>
          </div>
          <Row label="Passport no." value={user?.passportNumber} mono wide />
          <Row label="Class" value={CLASS[user?.accountType] || 'Student'} />
          <Row label="Date of issue" value={fmtDate(user?.createdAt)} mono />
          <Row label="Issuing office" value={user?.profile?.location || 'Karachi'} />
          <Row label="Field declared" value={field?.name} empty="Not yet" />
        </dl>
      </div>

      {stamped && (
        <div className="pv-verified" role="img" aria-label="Verified stamp">
          <span className="pv-verified__ink">
            <span>PATHSEEKER</span>
            <b>VERIFIED</b>
            <span>{fmtDate(user?.createdAt)}</span>
          </span>
        </div>
      )}

      <div className="pv-mrz" aria-hidden="true">{l1}<br />{l2}</div>
    </div>
  );
}

/* ── Right page tabs ─────────────────────────────────────── */
function ProfileTab({ user }) {
  const p = user?.profile || {};
  const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((x) => x.trim()) : []);
  const skills = list(p.skills);
  const interests = list(p.interests);
  return (
    <>
      <dl className="pv-fields pv-fields--2">
        <Row label="Full name" value={user?.name} wide />
        <Row label="Registered email" value={user?.email} mono wide />
        <Row label="Education" value={p.education} />
        <Row label="Current role" value={p.currentRole} />
        <Row label="Age" value={p.age ? String(p.age) : null} />
        <Row label="Location" value={p.location} />
      </dl>
      <div className="pv-chipset">
        <span className="pv-chipset__k">Skills</span>
        {skills.length ? skills.map((s) => <span key={s} className="pv-chip">{s}</span>) : <span className="pv-muted">None added yet</span>}
      </div>
      <div className="pv-chipset">
        <span className="pv-chipset__k">Interests</span>
        {interests.length ? interests.map((s) => <span key={s} className="pv-chip">{s}</span>) : <span className="pv-muted">None added yet</span>}
      </div>
      <Link to="/account" className="pv-link">Edit these details</Link>
    </>
  );
}

function TraitsTab({ result }) {
  if (!result?.riasecVector) {
    return (
      <div className="pv-empty">
        <p>Your traits are measured by the questions. Answer seven and this page fills in.</p>
        <Link to="/quiz?mode=quick" className="pv-cta">Answer 7 questions</Link>
      </div>
    );
  }
  const top = result.dominantAxes || [];
  return (
    <>
      <p className="pv-lead">Your strongest pair is <b>{top.map((a) => AXIS[a]).join(' and ')}</b>. Scored 0–10 from your answers.</p>
      <ul className="pv-traits">
        {Object.keys(AXIS).map((k) => {
          const v = Number(result.riasecVector[k] || 0);
          return (
            <li key={k} className={top.includes(k) ? 'is-top' : ''}>
              <span className="pv-traits__name">{AXIS[k]}<small>{AXIS_NOTE[k]}</small></span>
              <span className="pv-traits__bar"><span style={{ width: `${Math.max(2, v * 10)}%` }} /></span>
              <span className="pv-traits__v">{v.toFixed(1)}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function DestinationTab({ result, field }) {
  const top = result?.matches?.[0];
  if (!top) {
    return (
      <div className="pv-empty">
        <p>{field ? `You have declared ${field.name}. Choose a gate at the terminal and your destination is printed here.` : 'No destination yet. Choose a field, then a gate, and it is printed here.'}</p>
        <Link to={field ? '/airport' : '/interests'} className="pv-cta">{field ? 'Go to the gates' : 'Choose your field'}</Link>
      </div>
    );
  }
  return (
    <div className="pv-visa">
      <div className="pv-visa__head">
        <span>Entry visa</span>
        <span className="is-mono">{fmtDate(result.takenAt)}</span>
      </div>
      <p className="pv-visa__k">Best-matched destination</p>
      <p className="pv-visa__title">{top.career.title}</p>
      <dl className="pv-fields pv-fields--2">
        <Row label="Field" value={top.career.field?.name} />
        <Row label="Match" value={`${top.score}%`} mono />
      </dl>
      <div className="pv-visa__bar"><span style={{ width: `${top.score}%` }} /></div>
      <Link to="/result" className="pv-link">Read the full report</Link>
    </div>
  );
}

function StampsTab({ user, result }) {
  const earned = [
    { key: 'admitted', status: 'ADMITTED', port: 'KARACHI · JINNAH INTL', date: user?.createdAt, colour: '#2e7d5b', label: 'Passport issued' },
    result && {
      key: 'route',
      status: 'ROUTED',
      port: `${(result.matches?.[0]?.career?.field?.name || 'CAREER').toUpperCase()} GATES`,
      date: result.takenAt,
      colour: '#2b4f9c',
      label: 'Route assigned',
    },
  ].filter(Boolean);
  const ahead = result ? ['Roadmap flown'] : ['Route assigned', 'Roadmap flown'];
  return (
    <>
    <p className="pv-lead">
      A stamp is added at each point of the journey: when the passport is issued,
      when the questions assign a route, and when the roadmap is flown.
    </p>
    <div className="pv-stamps">
      {earned.map((s, i) => (
        <figure key={s.key} className="pv-stamp">
          <EntryStamp size={124} status={s.status} port={s.port} date={s.date || new Date()} colour={s.colour} seed={i + 3} />
          <figcaption>{s.label}</figcaption>
        </figure>
      ))}
      {ahead.map((label) => (
        <figure key={label} className="pv-stamp pv-stamp--ahead">
          <span className="pv-stamp__slot">Not yet stamped</span>
          <figcaption>{label}</figcaption>
        </figure>
      ))}
    </div>
    </>
  );
}

const TABS = [
  { id: 'profile', label: 'Profile', Comp: ProfileTab },
  { id: 'traits', label: 'Traits', Comp: TraitsTab },
  { id: 'destination', label: 'Destination', Comp: DestinationTab },
  { id: 'stamps', label: 'Stamps', Comp: StampsTab },
];

/**
 * The Career Passport, open.
 *
 * A green book whose cover swings away onto a two-page spread: the data page
 * on the left, and four tabbed pages on the right. Every value printed comes
 * from the holder's account and their latest result; anything not yet known
 * says so rather than being filled in.
 */
export function Passport({ user = null, result = null, field = null, open = false, stamped = false, closing = false, typing = true }) {
  const [tab, setTab] = useState('profile');
  const Current = TABS.find((t) => t.id === tab).Comp;

  return (
    <div className={`pv ${open ? 'pv--open' : ''} ${closing ? 'pv--closing' : ''}`}>
      <div className="pv-book">
        <div className="pv-spread">
          <DataPage user={user} field={field} typing={typing} stamped={stamped} />

          <div className="pv-page pv-page--tabs">
            <div className="pv-tabs" role="tablist" aria-label="Passport pages">
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`pv-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="pv-panel"
                  className="pv-tab"
                  onClick={() => setTab(t.id)}
                >
                  <span className="pv-tab__n">{String(i + 2).padStart(2, '0')}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="pv-panel" id="pv-panel" role="tabpanel" aria-labelledby={`pv-tab-${tab}`} key={tab}>
              <Current user={user} result={result} field={field} />
            </div>
          </div>
        </div>

        <div className="pv-cover" aria-hidden={open}>
          <span className="pv-cover__stitch" />
          <div className="pv-cover__foil">
            <span className="pv-cover__sm">PathSeeker</span>
            <span className="pv-cover__lg">Career Passport</span>
            <PassportEmblem size={130} />
            <span className="pv-cover__ur" lang="ur">کیریئر پاسپورٹ</span>
            <span className="pv-cover__no">{user?.passportNumber || 'Awaiting issue'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
