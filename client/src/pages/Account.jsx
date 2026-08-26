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

  const [form, setForm] = useState({
    name: '', education: '', currentRole: '', location: '', age: '',
    accountType: 'student', skills: '', interests: '', experience: [],
  });
  const [resumeBusy, setResumeBusy] = useState(false);
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
      accountType: user.accountType || 'student',
      skills: (user.profile?.skills || []).join(', '),
      interests: (user.profile?.interests || []).join(', '),
      experience: user.profile?.workExperience?.length
        ? user.profile.workExperience.map((w) => ({ ...w, years: w.years ?? '' }))
        : [{ title: '', organisation: '', years: '', summary: '' }],
      age: user.profile?.age ?? '',
    });
  }, [user]);

  useEffect(() => {
    let alive = true;
    quizService.latestResult().then((r) => alive && setResult(r)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /**
   * Resume upload.
   *
   * Read to base64 in the browser and posted as JSON, so the server needs no
   * multipart dependency for one endpoint. The size is checked here as well
   * as on the server — not for security, which has to be server-side, but so
   * someone picking a 40 MB scan is told immediately instead of waiting for
   * an upload that was always going to be refused.
   */
  const uploadResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('That file is over 2 MB. Try exporting the PDF at a smaller size.');
      e.target.value = '';
      return;
    }

    setResumeBusy(true);
    setError('');
    setNote('');
    try {
      const data = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error('That file could not be read.'));
        fr.readAsDataURL(file);
      });
      const res = await api.post('/users/me/resume', { filename: file.name, data });
      patchUser(res.data.user);
      setNote('Resume uploaded.');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setResumeBusy(false);
      e.target.value = '';
    }
  };

  const removeResume = async () => {
    setResumeBusy(true);
    try {
      const res = await api.delete('/users/me/resume');
      patchUser(res.data.user);
      setNote('Resume removed.');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setResumeBusy(false);
    }
  };

  const setExperience = (i, k, v) =>
    setForm((f) => ({
      ...f,
      experience: f.experience.map((w, idx) => (idx === i ? { ...w, [k]: v } : w)),
    }));

/** "react, node, sql" -> ['react','node','sql'], with blanks dropped. */
const splitList = (v) =>
  String(v || '').split(',').map((x) => x.trim()).filter(Boolean);


  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNote('');
    setError('');
    try {
      const { data } = await api.patch('/users/me', {
        name: form.name,
        accountType: form.accountType,
        profile: {
          education: form.education,
          currentRole: form.currentRole,
          location: form.location,
          age: form.age === '' ? null : Number(form.age),
          // Comma-separated in the field, an array on the wire. Empty
          // entries are dropped rather than stored as blanks.
          skills: splitList(form.skills),
          interests: splitList(form.interests),
          workExperience: form.experience
            .filter((w) => w.title.trim() || w.organisation.trim())
            .map((w) => ({ ...w, years: w.years === '' ? null : Number(w.years) })),
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

  if (!user) return <div className="page wrap acct"><p className="t-low">Loading…</p></div>;

  const top = result?.matches?.[0];

  return (
    <div className="page wrap acct">
      <header className="page__head">
        <div>
          {/* The name is printed on the document below. Repeating it here
              at heading size cost a third of the fold and said nothing the
              passport does not say better. */}
          <p className="t-eyebrow">Account</p>
          <h1 className="t-h3 page__title">Your passport</h1>
        </div>
        <div className="row" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {/* The browser's own print-to-PDF does the export. No library, no
              upload, and the file is produced on their machine rather than
              being generated somewhere and sent back. */}
          <Button variant="secondary" onClick={() => window.print()}>Save as PDF</Button>
          <Button variant="ghost" to="/dashboard">Back to dashboard</Button>
        </div>
      </header>

      <div className="acct__grid">
        {/* ── The document ─────────────────────────────── */}
        <section className="acct__doc">
          <div className="acct__doc-head">
            <span className="acct__doc-mark"><Logo size={30} /></span>
            <div>
              <p className="acct__doc-auth">PathSeeker · Career Authority</p>
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
            <div><dt>Class</dt><dd style={{ textTransform: 'capitalize' }}>{user.accountType || 'student'}</dd></div>
            <div><dt>Education</dt><dd>{user.profile?.education || <em className="t-low">Not recorded</em>}</dd></div>
            <div><dt>Age</dt><dd>{user.profile?.age ?? <em className="t-low">Not recorded</em>}</dd></div>
            <div><dt>Location</dt><dd>{user.profile?.location || <em className="t-low">Not recorded</em>}</dd></div>
            <div><dt>Current role</dt><dd>{user.profile?.currentRole || <em className="t-low">Not recorded</em>}</dd></div>

            {/* Everything the edit panel can change is printed here, or the
                form writes to fields the document never shows. */}
            <div>
              <dt>Skills</dt>
              <dd>
                {user.profile?.skills?.length
                  ? <span className="acct__chips">{user.profile.skills.map((k) => <span key={k}>{k}</span>)}</span>
                  : <em className="t-low">Not recorded</em>}
              </dd>
            </div>
            <div>
              <dt>Interests</dt>
              <dd>
                {user.profile?.interests?.length
                  ? <span className="acct__chips">{user.profile.interests.map((k) => <span key={k}>{k}</span>)}</span>
                  : <em className="t-low">Not recorded</em>}
              </dd>
            </div>
            <div>
              <dt>Experience</dt>
              <dd>
                {user.profile?.workExperience?.length ? (
                  <span className="acct__exp-list">
                    {user.profile.workExperience.map((w, i) => (
                      <span key={i}>
                        {w.title}{w.organisation ? ` · ${w.organisation}` : ''}
                        {w.years ? ` · ${w.years} yr${w.years === 1 ? '' : 's'}` : ''}
                      </span>
                    ))}
                  </span>
                ) : <em className="t-low">Not recorded</em>}
              </dd>
            </div>
            <div>
              <dt>Resume</dt>
              <dd>
                {user.profile?.resumeName
                  ? <a href="/api/users/me/resume" className="acct__file">{user.profile.resumeName}</a>
                  : <em className="t-low">Not uploaded</em>}
              </dd>
            </div>
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

            <label className="field">
              <span className="field__label">Traveller class</span>
              <select className="field__input" value={form.accountType} onChange={set('accountType')}>
                <option value="student">Student</option>
                <option value="graduate">Graduate</option>
                <option value="professional">Professional</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Skills</span>
              <input className="field__input" value={form.skills} onChange={set('skills')} placeholder="React, SQL, public speaking" />
              <span className="field__hint">Separated by commas.</span>
            </label>

            <label className="field">
              <span className="field__label">Interests</span>
              <input className="field__input" value={form.interests} onChange={set('interests')} placeholder="AI, fintech, product design" />
              <span className="field__hint">Separated by commas.</span>
            </label>

            {/* Only asked of graduates and professionals. A student has
                nothing to put here and being asked implies they should. */}
            {form.accountType !== 'student' && (
              <fieldset className="acct__exp">
                <legend className="field__label">Work experience</legend>
                {form.experience.map((w, i) => (
                  <div className="acct__exp-row" key={i}>
                    <input
                      className="field__input"
                      value={w.title}
                      placeholder="Role"
                      onChange={(e) => setExperience(i, 'title', e.target.value)}
                    />
                    <input
                      className="field__input"
                      value={w.organisation}
                      placeholder="Organisation"
                      onChange={(e) => setExperience(i, 'organisation', e.target.value)}
                    />
                    <input
                      className="field__input"
                      type="number"
                      min="0"
                      max="60"
                      value={w.years}
                      placeholder="Yrs"
                      onChange={(e) => setExperience(i, 'years', e.target.value)}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  className="alink"
                  onClick={() => setForm((f) => ({
                    ...f,
                    experience: [...f.experience, { title: '', organisation: '', years: '', summary: '' }],
                  }))}
                >
                  Add another role
                </button>
              </fieldset>
            )}

            <div className="acct__resume">
              <span className="field__label">Resume</span>
              {user.profile?.resumeName ? (
                <div className="acct__resume-has">
                  <span className="acct__resume-name">{user.profile.resumeName}</span>
                  <span className="atable__acts">
                    {/* An explicit click, served back as an attachment with
                        sniffing disabled — nothing downloads on its own. */}
                    <a className="alink" href="/api/users/me/resume">Download</a>
                    <button type="button" className="alink alink--bad" onClick={removeResume} disabled={resumeBusy}>
                      Remove
                    </button>
                  </span>
                </div>
              ) : (
                <p className="field__hint">Nothing uploaded yet.</p>
              )}
              <input
                className="field__input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={uploadResume}
                disabled={resumeBusy}
                aria-label="Upload your resume"
              />
              <span className="field__hint">
                PDF or Word, up to 2 MB. Only you can download it.
              </span>
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
