import { useEffect, useState } from 'react';
import { useTypewriter } from '../../hooks/useTypewriter.js';
import { CompassMark } from './CompassMark.jsx';
import '../../styles/passport.css';

/** Builds a passport-style machine-readable zone from the real user data. */
function mrz(user) {
  const surname = (user?.name || 'TRAVELLER').trim().toUpperCase().replace(/\s+/g, '<');
  const number = (user?.passportNumber || 'PS<<<<<<<<<<').replace(/-/g, '');
  const issued = user?.createdAt ? new Date(user.createdAt) : new Date();
  const stamp = `${String(issued.getFullYear()).slice(2)}${String(issued.getMonth() + 1).padStart(2, '0')}${String(issued.getDate()).padStart(2, '0')}`;
  const line1 = `P<PSK${surname}<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44).padEnd(44, '<');
  const line2 = `${number}<PSK${stamp}<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44).padEnd(44, '<');
  return [line1, line2];
}

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : null;

/** One field row on a passport page. Renders an honest empty state rather than a blank. */
function Field({ label, value, mono = false, placeholder = 'Not yet issued', children }) {
  const empty = !value && !children;
  return (
    <div>
      <div className="pp__field-label">{label}</div>
      <div
        className={[
          'pp__field-value',
          mono ? 'pp__field-value--mono' : '',
          empty ? 'pp__field-value--empty' : '',
        ].filter(Boolean).join(' ')}
      >
        {children || value || placeholder}
      </div>
    </div>
  );
}

/* ── Page 1 — the identity page ─────────────────────────── */
function PageIdentity({ user, typing }) {
  const { shown, done } = useTypewriter(user?.name || '', { animate: typing });
  const [l1, l2] = mrz(user);

  return (
    <>
      <div className="pp__eyebrow">Islamic Republic · Career Authority</div>
      <div className="pp__rule" />
      {/* The title runs full width. Sitting it beside the photo clips as soon
          as the passport narrows to fit a short viewport. */}
      <h2 className="pp__h">PathSeeker<br />Career Passport</h2>
      <div className="pp__identity">
        <div className="pp__photo" aria-hidden="true">
          {(user?.name || '?').trim().charAt(0).toUpperCase()}
        </div>
        <div className="pp__fields pp__identity-fields">
          <Field label="Holder">
            {user ? (
              <>
                {shown}
                {!done && <span className="pp__caret" aria-hidden="true" />}
              </>
            ) : null}
          </Field>
          <Field label="Passport No." value={user?.passportNumber} mono />
        </div>
      </div>
      <div className="pp__mrz" aria-hidden="true">{l1}<br />{l2}</div>
    </>
  );
}

/* ── Page 2 — personal information ──────────────────────── */
function PagePersonal({ user }) {
  return (
    <>
      <div className="pp__eyebrow">Page 02 · Personal Information</div>
      <div className="pp__rule" />
      <h2 className="pp__h">Personal Information</h2>
      <div className="pp__fields">
        <Field label="Full Name" value={user?.name} />
        <Field label="Registered Email" value={user?.email} mono />
        {/* The password is never sent to the client and never rendered. This
            is a fixed mask, not a length hint and not the real value. */}
        <Field label="Access Key">
          <span className="pp__field-value--mono" style={{ letterSpacing: '0.22em' }}>••••••••</span>
        </Field>
        <Field label="Date of Issue" value={fmtDate(user?.createdAt)} mono />
      </div>
    </>
  );
}

/* ── Page 3 — career identity ───────────────────────────── */
function PageIdentityCareer({ user, result }) {
  const axes = result?.dominantAxes || [];
  const AXIS = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };

  return (
    <>
      <div className="pp__eyebrow">Page 03 · Career Identity</div>
      <div className="pp__rule" />
      <h2 className="pp__h">Career Identity</h2>
      <div className="pp__fields">
        <Field label="Education" value={user?.profile?.education} placeholder="Not recorded" />
        <Field label="Current Role" value={user?.profile?.currentRole} placeholder="Not recorded" />
        <Field
          label="Dominant Traits"
          value={axes.length ? axes.map((a) => AXIS[a]).join(' · ') : null}
          placeholder="Determined by the quiz"
        />
      </div>
    </>
  );
}

/* ── Page 4 — career destination ────────────────────────── */
function PageDestination({ result }) {
  const top = result?.matches?.[0];
  return (
    <>
      <div className="pp__eyebrow">Page 04 · Career Destination</div>
      <div className="pp__rule" />
      <h2 className="pp__h">Career Destination</h2>
      <div className="pp__fields">
        <Field label="Destination" value={top?.career?.title} placeholder="Not yet determined" />
        <Field label="Match" value={top ? `${top.score}%` : null} mono placeholder="—" />
        <Field label="Field" value={top?.career?.field?.name} placeholder="—" />
      </div>
      {!top && (
        <p className="pp__field-label" style={{ marginTop: 'var(--sp-5)', lineHeight: 1.7, textTransform: 'none', letterSpacing: 0 }}>
          This page is stamped when you complete the journey.
        </p>
      )}
    </>
  );
}

const PAGES = [PageIdentity, PagePersonal, PageIdentityCareer, PageDestination];

/**
 * The interactive Career Passport.
 *
 * @param {object}  user     signed-in user, or null before authentication
 * @param {object}  result   latest quiz result, if there is one
 * @param {boolean} open     cover swung open
 * @param {boolean} stamped  VERIFIED stamp has landed
 * @param {boolean} closing  playing the closing transition
 * @param {number}  page     which page is showing
 */
export function Passport({
  user = null,
  result = null,
  open = false,
  stamped = false,
  closing = false,
  page = 0,
  onPageChange,
  typing = true,
}) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!stamped) return undefined;
    setShake(true);
    const t = setTimeout(() => setShake(false), 900);
    return () => clearTimeout(t);
  }, [stamped]);

  const Page = PAGES[page] || PAGES[0];
  const canPage = typeof onPageChange === 'function';

  return (
    <div className="pp-stage">
      <div
        className={[
          'pp',
          open ? 'pp--open' : '',
          closing ? 'pp--closing' : '',
          shake ? 'pp--shake' : '',
        ].filter(Boolean).join(' ')}
      >
        {/* The paper inside */}
        <div className="pp__book">
          <div className="pp__guilloche" aria-hidden="true" />
          <div className="pp__page pp__page--active" key={page}>
            <Page user={user} result={result} typing={typing} />
          </div>

          {stamped && (
            <div className="pp__stamp pp__stamp--landed" role="img" aria-label="Career Passport verified stamp">
              <span className="pp__shockwave" aria-hidden="true" />
              <span className="pp__stamp-ink">
                <span className="pp__stamp-brand">PATHSEEKER</span>
                <span className="pp__stamp-word">VERIFIED</span>
                <span className="pp__stamp-date">{fmtDate(user?.createdAt) || ''}</span>
              </span>
            </div>
          )}
        </div>

        {/* The cover, which swings away on open */}
        <div className="pp__cover" aria-hidden={open}>
          <span className="pp__sheen" aria-hidden="true" />
          <div className="pp__foil">
            <div>
              <div className="pp__crest"><CompassMark /></div>
              <div className="pp__cover-title">Career<br />Passport</div>
              <div className="pp__cover-sub">PathSeeker · Career Passport</div>
            </div>
            <div />
            <div className="pp__cover-foot">{user?.passportNumber || 'AWAITING ISSUE'}</div>
          </div>
        </div>
      </div>

      {canPage && open && (
        <nav className="pp-nav" aria-label="Passport pages">
          <button
            type="button"
            className="pp-nav__btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="pp-nav__dots">
            {PAGES.map((_, i) => (
              <span key={i} className={`pp-nav__dot ${i === page ? 'pp-nav__dot--on' : ''}`} />
            ))}
          </span>
          <button
            type="button"
            className="pp-nav__btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page === PAGES.length - 1}
            aria-label="Next page"
          >
            ›
          </button>
        </nav>
      )}
    </div>
  );
}

export const PASSPORT_PAGE_COUNT = PAGES.length;
