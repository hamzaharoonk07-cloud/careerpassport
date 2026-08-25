import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { Logo } from '../components/brand/Logo.jsx';
import { api, apiError } from '../services/api.js';
import { quizService } from '../services/quiz.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/account.css';

const AXIS_NAME = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
};

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

/**
 * The traveller's own document — reached by clicking the passport number in
 * the navigation.
 *
 * Read-only fields sit alongside an editable profile. The password is shown
 * as a fixed mask, never as a value and never as a length hint, and there is
 * no endpoint that could return it even if this page asked.
 */
export default function Account() {
  const { user, patchUser } = useAuth();

  const [form, setForm] = useState({ name: '', education: '', currentRole: '', location: '', age: '' });
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      education: user.profile?.education || '',
      currentRole: user.profile?.currentRole || '',
      location: user.profile?.location || '',
      age: user.profile?.age ?? '',
    });
  }, [user]);

  useEffect(() => {
    let alive = true;
    quizService.latestResult().then((r) => alive && setResult(r)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNote('');
    setError('');
    try {
      const { data } = await api.patch('/users/me', {
        name: form.name,
        profile: {
          education: form.education,
          currentRole: form.currentRole,
          location: form.location,
          age: form.age === '' ? null : Number(form.age),
        },
      });
      patchUser(data.user);
      setNote('Your passport has been updated.');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="page wrap"><p className="t-low">Loading…</p></div>;

  const top = result?.matches?.[0];

  return (
    <div className="page wrap acct">
      <header className="page__head">
        <div>
          <p className="t-eyebrow">Account · Travel document</p>
          <h1 className="t-h2 page__title">{user.name}</h1>
        </div>
        <Button variant="ghost" to="/dashboard">Back to dashboard</Button>
      </header>

      <div className="acct__grid">
        {/* ── The document ─────────────────────────────── */}
        <section className="acct__doc">
          <div className="acct__doc-head">
            <span className="acct__doc-mark"><Logo size={30} /></span>
            <div>
              <p className="acct__doc-auth">Career Passport · Career Authority</p>
              <p className="acct__doc-no t-mono">{user.passportNumber}</p>
            </div>
            <span className={`acct__badge ${user.role === 'admin' ? 'acct__badge--admin' : ''}`}>
              {user.role === 'admin' ? 'Administrator' : 'Traveller'}
            </span>
          </div>

          <dl className="acct__facts">
            <div><dt>Full name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd className="t-mono">{user.email}</dd></div>
            <div><dt>Password</dt><dd className="t-mono">••••••••</dd></div>
            <div><dt>Issued</dt><dd>{fmtDate(user.createdAt)}</dd></div>
            <div><dt>Education</dt><dd>{user.profile?.education || <em className="t-low">Not recorded</em>}</dd></div>
            <div><dt>Age</dt><dd>{user.profile?.age ?? <em className="t-low">Not recorded</em>}</dd></div>
            <div><dt>Journey stage</dt><dd style={{ textTransform: 'capitalize' }}>{user.journeyStage?.replace('-', ' ')}</dd></div>
            <div>
              <dt>Destination</dt>
              <dd>{top ? <Link to={`/careers/${top.career.slug}`}>{top.career.title} · {top.score}%</Link> : <em className="t-low">Not yet flown</em>}</dd>
            </div>
          </dl>

          {result?.riasecVector && (
            <div className="acct__traits">
              <p className="t-eyebrow">Trait profile</p>
              <div className="axes" style={{ marginTop: 'var(--sp-3)' }}>
                {Object.entries(result.riasecVector).map(([k, v]) => (
                  <div className="axis" key={k}>
                    <span className="axis__k">{AXIS_NAME[k]}</span>
                    <span className="axis__track"><span className="axis__fill" style={{ width: `${(v / 10) * 100}%` }} /></span>
                    <span className="axis__v">{Number(v).toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Editable profile ─────────────────────────── */}
        <section className="panel">
          <h2 className="panel__h">Update your details</h2>
          <form className="acct__form" onSubmit={save}>
            {note && <p className="acct__note">{note}</p>}
            {error && <div className="auth__alert" role="alert">{error}</div>}

            <div className="field">
              <label className="field__label" htmlFor="acc-name">Full name</label>
              <input id="acc-name" className="field__input" value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="acc-edu">Education</label>
              <input id="acc-edu" className="field__input" value={form.education} onChange={set('education')} placeholder="BS Computer Science" />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="acc-role">Current role</label>
              <input id="acc-role" className="field__input" value={form.currentRole} onChange={set('currentRole')} placeholder="Student" />
            </div>
            <div className="acct__row">
              <div className="field">
                <label className="field__label" htmlFor="acc-loc">Location</label>
                <input id="acc-loc" className="field__input" value={form.location} onChange={set('location')} placeholder="Karachi" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="acc-age">Age</label>
                <input id="acc-age" className="field__input" type="number" min="13" max="100" value={form.age} onChange={set('age')} />
              </div>
            </div>

            <Button type="submit" loading={saving} full>Save changes</Button>
          </form>

          {user.role === 'admin' && (
            <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--ink-600)' }}>
              <p className="t-low" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-3)' }}>
                You have administrator access.
              </p>
              <Button variant="secondary" to="/admin" full>Open the admin panel</Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
