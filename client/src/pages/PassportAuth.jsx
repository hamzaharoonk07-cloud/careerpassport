import { forwardRef, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { StateEmblem } from '../components/brand/StateEmblem.jsx';
import { EntryStamp } from '../components/brand/EntryStamp.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiError } from '../services/api.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { playChime, playStamp } from '../utils/sound.js';


import './PassportAuth.css';

/** One field inside the passport. Labelled like a real document. */
const PField = forwardRef(function PField({ id, label, error, half = false, hint, ...rest }, ref) {
  return (
    <div className={`pf ${half ? 'pf--half' : ''}`}>
      <label className="pf__label" htmlFor={id}>{label}</label>
      <input
        ref={ref}
        id={id}
        name={id}
        className="pf__input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {hint && !error && <span className="pf__hint" id={`${id}-hint`}>{hint}</span>}
      {error && <span className="pf__err" id={`${id}-err`}>{error}</span>}
    </div>
  );
});

const EMPTY_REGISTER = {
  name: '', email: '', password: '', confirmPassword: '', education: '', age: '',
};

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
            value={form.password} onChange={set('password')} error={errors.password}
            autoComplete="new-password" placeholder="Min. 8 characters" disabled={busy}
          />
          <PField
            id="confirmPassword" label="Confirm" type="password"
            value={form.confirmPassword} onChange={set('confirmPassword')}
            error={errors.confirmPassword} autoComplete="new-password" disabled={busy}
          />
        </div>
      ) : (
        <PField
          id="password" label="Password" type="password"
          value={form.password} onChange={set('password')} error={errors.password}
          autoComplete="current-password" disabled={busy}
        />
      )}

      {mode === 'register' && (
        <>
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
    <main className={`pa ${open ? 'pa--open' : ''} ${phase === 'done' ? 'pa--exit' : ''}`}>
      <SceneVideo src="/videos/terminal.mp4" poster="/images/terminal.jpg" loop />

      <Link to="/" className="pa__back t-eyebrow">← Career Passport</Link>

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
            <div className="pa__page pa__page--left">
              <div className="pa__crest"><StateEmblem size={42} /></div>
              <p className="pa__doc">Islamic Republic of Pakistan · Career Authority</p>
              <h1 className="pa__h">
                {mode === 'register' ? 'Passport Application' : 'Present Your Passport'}
              </h1>
              <p className="pa__blurb">
                {mode === 'register'
                  ? 'Fill in your details and your passport number is issued on the spot. No verification email, no waiting.'
                  : 'Sign in and your document picks up exactly where you left it.'}
              </p>

              <div className="pa__seal" aria-hidden="true" />

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

          {(phase === 'stamping' || phase === 'done') && (
            <div className="pa__stamp">
              <span className="pa__shock" aria-hidden="true" />
              <EntryStamp
                size={210}
                status="ADMITTED"
                port="KARACHI · JINNAH INTL"
                seed={(user?.passportNumber || '').length}
              />
            </div>
          )}

          {/* ── The cover ────────────────────────────────── */}
          <div className="pa__cover" aria-hidden={open}>
            <span className="pa__sheen" aria-hidden="true" />
            <div className="pa__foil">
              <div className="pa__foil-country">
                <span className="pa__foil-country-sm">Islamic Republic of</span>
                <span className="pa__foil-country-lg">Pakistan</span>
              </div>
              <div className="pa__foil-crest"><StateEmblem size={78} /></div>
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
