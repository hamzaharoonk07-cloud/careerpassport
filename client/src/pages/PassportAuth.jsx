import { forwardRef, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { Logo } from '../components/brand/Logo.jsx';
import { EntryStamp } from '../components/brand/EntryStamp.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiError } from '../services/api.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { playChime, playStamp } from '../utils/sound.js';


import './PassportAuth.css';

/** One field inside the passport. Labelled like a real document. */
/** Comma-separated text to a clean array; undefined when nothing was typed. */
const toList = (text) => {
  const items = text.split(',').map((t) => t.trim()).filter(Boolean);
  return items.length ? items : undefined;
};

const PField = forwardRef(function PField({ id, label, error, half = false, hint, type, ...rest }, ref) {
  // A password field you cannot read back is where most sign-up typos live,
  // and the confirm box only tells you the two disagree, never which is
  // wrong. The toggle is per-field rather than global: revealing one should
  // not reveal the other on a shared screen.
  const [shown, setShown] = useState(false);
  const isSecret = type === 'password';

  return (
    <div className={`pf ${half ? 'pf--half' : ''}`}>
      <label className="pf__label" htmlFor={id}>{label}</label>

      <span className={`pf__wrap ${isSecret ? 'pf__wrap--secret' : ''}`}>
        <input
          ref={ref}
          id={id}
          name={id}
          type={isSecret && shown ? 'text' : type}
          className="pf__input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        {isSecret && (
          <button
            type="button"
            className="pf__reveal"
            onClick={() => setShown((v) => !v)}
            aria-pressed={shown}
            aria-label={shown ? 'Hide password' : 'Show password'}
            title={shown ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </span>

      {hint && !error && <span className="pf__hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="pf__err" id={`${id}-err`}>{error}</span>}
    </div>
  );
});

const EMPTY_REGISTER = {
  name: '', email: '', password: '', confirmPassword: '', education: '', age: '',
  currentRole: '', location: '', skills: '', interests: '',
  accountType: 'student',
};

/**
 * The three kinds of traveller.
 *
 * This is not the authorisation role — that stays 'user' or 'admin' on the
 * server. It changes what the passport asks for and what the dashboard
 * leads with.
 */
const ACCOUNT_TYPES = [
  { id: 'student', label: 'Student', note: 'Still studying' },
  { id: 'graduate', label: 'Graduate', note: 'Finished, deciding' },
  { id: 'professional', label: 'Professional', note: 'Working, considering a change' },
];

/**
 * The passport IS the auth interface.
 *
 * Closed book → "Open your passport" → 3D cover swing → the form is printed on
 * the inside pages → submit → verification → official stamp → the journey.
 *
 * The authentication underneath is untouched: the same POST /api/auth/register
 * and /api/auth/login, the same zod validation, the same httpOnly cookies.
 * Only the surface changed.
 */
export default function PassportAuth() {
  const { mode: paramMode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // /login and /register carry no :mode param — the path itself is the mode.
  const routeMode =
    paramMode || (location.pathname.includes('register') ? 'register' : 'login');
  // `user` is read when the entry stamp renders, to seed its ink variation
  // from the passport number. It has to be destructured here: `user?.x` on an
  // identifier that was never declared is a ReferenceError, not undefined, so
  // omitting it took down the whole tree the moment a login succeeded.
  const { register, login, user } = useAuth();
  const reduced = useReducedMotion();

  const [mode, setMode] = useState(routeMode === 'register' ? 'register' : 'login');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_REGISTER);
  const [errors, setErrors] = useState({});
  // True while a password box has focus. The dry seal on the facing page
  // covers itself for as long as it is — the clerk turning away while you
  // write, rather than a mascot mugging at the camera.
  const [secret, setSecret] = useState(false);
  const [alert, setAlert] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | verifying | stamping | done
  const [muted, setMuted] = useState(true);

  const firstFieldRef = useRef(null);
  const timers = useRef([]);
  const after = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => { setMode(routeMode === 'register' ? 'register' : 'login'); }, [routeMode]);

  // Focus the first field once the cover is out of the way, not before —
  // focusing mid-animation scrolls the page and fights the transition.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => firstFieldRef.current?.focus(), reduced ? 0 : 900);
    return () => clearTimeout(t);
  }, [open, reduced]);

  /**
   * The book leaves 3D once the cover has finished swinging open.
   *
   * `transform-style: preserve-3d` is what lets the cover rotate away in
   * space, and it is also what made the form unclickable: inside a preserve-3d
   * context the browser hit-tests by depth in that space rather than by
   * z-index, and every control on the pages sat behind the plane of their own
   * container. Nothing on the spread could be clicked — not the traveller
   * class, not the submit button — while everything looked perfectly normal
   * and hover states still worked.
   *
   * The 3D is only needed while the cover is moving. Once it has landed the
   * book flattens, hit-testing goes back to ordinary stacking, and the form
   * behaves like a form. The cover is not painted at this point — it has
   * rotated past its own backface — so flattening changes nothing visible.
   */
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!open) { setSettled(false); return undefined; }
    if (reduced) { setSettled(true); return undefined; }
    // --dur-5 is the cover transition; wait it out plus a frame.
    const t = setTimeout(() => setSettled(true), 1260);
    return () => clearTimeout(t);
  }, [open, reduced]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const openPassport = () => {
    setOpen(true);
    if (!muted) playChime();
  };

  const validate = () => {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (mode === 'register') {
      if (form.name.trim().length < 2) next.name = 'Please enter your full name';
      if (form.password.length < 8) next.password = 'At least 8 characters';
      if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
      if (form.age && (Number(form.age) < 13 || Number(form.age) > 100)) next.age = 'Enter a valid age';
    } else if (!form.password) {
      next.password = 'Password is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setAlert('');
    if (!validate()) return;

    setPhase('verifying');
    try {
      if (mode === 'register') {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          education: form.education || undefined,
          age: form.age ? Number(form.age) : undefined,
          currentRole: form.currentRole || undefined,
          location: form.location || undefined,
          skills: toList(form.skills),
          interests: toList(form.interests),
          accountType: form.accountType,
        });
      } else {
        await login({ email: form.email, password: form.password });
      }
    } catch (err) {
      // Put the passport back in the user's hands rather than stranding
      // them inside the verification animation.
      setPhase('idle');
      const details = err?.response?.data?.details;
      if (details) setErrors(details);
      else setAlert(apiError(err));
      return;
    }

    // Authenticated. Now play the ceremony.
    const dest = location.state?.from || '/airport';
    if (reduced) { navigate(dest, { replace: true }); return; }

    after(() => { setPhase('stamping'); if (!muted) playStamp(); }, 1100);
    after(() => setPhase('done'), 2300);
    after(() => navigate(dest, { replace: true }), 3200);
  };

  const busy = phase !== 'idle';

  /* The form is defined once and hosted in one of two places: the CSS
     passport's right-hand page, or — when the device can afford 3D — projected
     onto the real page mesh by drei's <Html transform>. Either way these are
     genuine DOM inputs, so autofill, focus order and screen readers all work. */
  const formEl = (
    <form className="pa__form pp3d-form" onSubmit={submit} noValidate>
      {alert && <div className="pa__alert" role="alert">{alert}</div>}

      {mode === 'register' && (
        <PField
          id="name" label="Full name" ref={firstFieldRef}
          value={form.name} onChange={set('name')} error={errors.name}
          autoComplete="name" placeholder="Muhammad Hammad" disabled={busy}
        />
      )}

      <PField
        id="email" label="Email" type="email"
        value={form.email} onChange={set('email')} error={errors.email}
        autoComplete="email" placeholder="you@example.com" disabled={busy}
      />

      {/* Registration pairs the two password fields on one line. Stacked, the
          spread came to 623px of content against a 588px laptop viewport and
          the form had to scroll inside the book; paired, it fits the page. */}
      {mode === 'register' ? (
        <div className="pa__row">
          <PField
            id="password" label="Password" type="password"
              onFocus={() => setSecret(true)} onBlur={() => setSecret(false)}
            value={form.password} onChange={set('password')} error={errors.password}
            autoComplete="new-password" placeholder="Min. 8 characters" disabled={busy}
          />
          <PField
            id="confirmPassword" label="Confirm" type="password"
            onFocus={() => setSecret(true)} onBlur={() => setSecret(false)}
            value={form.confirmPassword} onChange={set('confirmPassword')}
            error={errors.confirmPassword} autoComplete="new-password" disabled={busy}
          />
        </div>
      ) : (
        <PField
          id="password" label="Password" type="password"
              onFocus={() => setSecret(true)} onBlur={() => setSecret(false)}
          value={form.password} onChange={set('password')} error={errors.password}
          autoComplete="current-password" disabled={busy}
        />
      )}

      {mode === 'register' && (
        <>
          {/* Class of traveller. Three options that change what the rest of
              the journey emphasises, so they are visible at a glance rather
              than hidden behind a dropdown.
              
              Buttons rather than radios in labels. The label-wrapping-a-hidden-
              input pattern depends on the browser forwarding activation from
              whatever element the pointer actually landed on to a control that
              is deliberately invisible, and on nothing being layered in
              between. When that forwarding failed here the option simply did
              not select, with no error and no feedback — the hardest kind of
              bug to see, because the control looks completely normal.
              
              A button is its own hit target. A click on it is a click on it.
              role="radio" in a radiogroup keeps the semantics the same for
              assistive technology. */}
          <div className="pa__types">
            <span className="pf__label" id="traveller-class-label">Traveller class</span>
            <div className="pa__types-row" role="radiogroup" aria-labelledby="traveller-class-label">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={form.accountType === t.id}
                  disabled={busy}
                  className={`pa__type ${form.accountType === t.id ? 'pa__type--on' : ''}`}
                  onClick={() => {
                    setForm((f) => ({ ...f, accountType: t.id }));
                    setErrors((prev) => (prev.accountType ? { ...prev, accountType: undefined } : prev));
                  }}
                >
                  <span className="pa__type-l">{t.label}</span>
                  <span className="pa__type-n">{t.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pa__row">
            <PField
              id="education" label="Education" half
              value={form.education} onChange={set('education')} error={errors.education}
              placeholder="BS Computer Science" disabled={busy} hint="Optional"
            />
            <PField
              id="age" label="Age" half type="number" min="13" max="100"
              value={form.age} onChange={set('age')} error={errors.age}
              placeholder="21" disabled={busy} hint="Optional"
            />
          </div>

          {/* The rest of the passport. It used to be collected only on the
              account page, which meant every new traveller landed with a
              half-filled document and had to go and find the form. Still
              optional — none of it gates registration. */}
          <div className="pa__row">
            <PField
              id="currentRole" label="Current role" half
              value={form.currentRole} onChange={set('currentRole')} error={errors.currentRole}
              placeholder="Student" disabled={busy} hint="Optional"
            />
            <PField
              id="location" label="Location" half
              value={form.location} onChange={set('location')} error={errors.location}
              placeholder="Karachi" disabled={busy} hint="Optional"
            />
          </div>

          <PField
            id="skills" label="Skills"
            value={form.skills} onChange={set('skills')} error={errors.skills}
            placeholder="React, SQL, public speaking" disabled={busy} hint="Separated by commas"
          />
          <PField
            id="interests" label="Interests"
            value={form.interests} onChange={set('interests')} error={errors.interests}
            placeholder="AI, fintech, product design" disabled={busy} hint="Separated by commas"
          />
        </>
      )}

      <Button type="submit" full size="lg" loading={phase === 'verifying'} disabled={busy}>
        {mode === 'register' ? 'Submit for verification' : 'Verify my passport'}
      </Button>

      {mode === 'login' && (
        <button
          type="button"
          className="pa__demo"
          disabled={busy}
          onClick={() => setForm((f) => ({ ...f, email: 'demo@pathseeker.app', password: 'demo1234' }))}
        >
          Evaluating this project? Use the demo passport →
        </button>
      )}
    </form>
  );

  return (
    <main className={`pa ${open ? 'pa--open' : ''} ${settled ? 'pa--settled' : ''} ${phase === 'stamping' || phase === 'done' ? 'pa--stamping' : ''} ${phase === 'done' ? 'pa--exit' : ''}`}>
      <SceneVideo src="/videos/terminal.mp4" poster="/images/terminal.jpg" loop />

      <Link to="/" className="pa__back t-eyebrow">← PathSeeker</Link>

      <button
        type="button"
        className="pa__sound"
        onClick={() => setMuted((m) => !m)}
        aria-pressed={!muted}
      >
        {muted ? 'Sound off' : 'Sound on'}
      </button>

      <div className="pa__stage">
        <div className="pa__book">
          {/* ── Inside pages ─────────────────────────────── */}
          <div className="pa__pages">
            <div className={`pa__page pa__page--left ${secret ? 'pa__page--private' : ''}`}>
              <div className="pa__crest"><Logo size={42} /></div>
              <p className="pa__doc">PathSeeker · Career Authority</p>
              <h1 className="pa__h">
                {mode === 'register' ? 'Passport Application' : 'Present Your Passport'}
              </h1>
              <p className="pa__blurb">
                {mode === 'register'
                  ? 'Fill in your details and your passport number is issued on the spot. No verification email, no waiting.'
                  : 'Sign in and your document picks up exactly where you left it.'}
              </p>

              {/* The dry seal is where the stamp lands. It is a printed
                  ring waiting for ink, so the stamp is centred on it rather
                  than dropped in a corner of the spread. */}
              <div className="pa__sealwrap">
                <div className="pa__seal" aria-hidden="true" />
                {(phase === 'stamping' || phase === 'done') && (
                  <div className="pa__stamp" role="status" aria-label="Admitted">
                    <span className="pa__shock" aria-hidden="true" />
                    <EntryStamp
                      size={168}
                      status="ADMITTED"
                      port="KARACHI · JINNAH INTL"
                      seed={(user?.passportNumber || '').length}
                    />
                  </div>
                )}
              </div>

              <p className="pa__switch">
                {mode === 'register' ? 'Already have a passport?' : 'No passport yet?'}{' '}
                <button
                  type="button"
                  className="pa__link"
                  onClick={() => {
                    setMode(mode === 'register' ? 'login' : 'register');
                    setErrors({});
                    setAlert('');
                  }}
                >
                  {mode === 'register' ? 'Sign in' : 'Apply for one'}
                </button>
              </p>
            </div>

            <div className="pa__page pa__page--right">
              {formEl}
            </div>
          </div>

          {/* ── Verification + stamp ─────────────────────── */}
          {phase === 'verifying' && (
            <div className="pa__verify" role="status">
              <span className="pa__verify-ring" aria-hidden="true" />
              <span className="pa__verify-text">Verifying your details…</span>
            </div>
          )}

          {/* ── The cover ────────────────────────────────── */}
          <div className="pa__cover" aria-hidden={open}>
            <span className="pa__sheen" aria-hidden="true" />
            <div className="pa__foil">
              <div className="pa__foil-country">
                <span className="pa__foil-country-sm">PathSeeker</span>
                <span className="pa__foil-country-lg">Pakistan</span>
              </div>
              <div className="pa__foil-crest"><Logo size={78} /></div>
              <div className="pa__foil-urdu" lang="ur">اسلامی جمہوریہ پاکستان</div>
              <div className="pa__foil-title">
                <span>Passport</span>
                <span className="pa__foil-title-ur" lang="ur">پاسپورٹ</span>
              </div>
            </div>
          </div>
        </div>

        {!open && (
          <div className="pa__opencta">
            <Button size="lg" onClick={openPassport}>Open your passport</Button>
            <p className="pa__opencta-note">Your journey begins with a document.</p>
          </div>
        )}
      </div>
    </main>
  );
}
