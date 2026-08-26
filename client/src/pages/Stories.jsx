import { useEffect, useState } from 'react';
import { Button } from '../components/primitives/Button.jsx';
import { publicService } from '../services/public.service.js';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/hub.css';

const EMPTY = { name: '', headline: '', story: '', roleTitle: '' };

/**
 * Success stories.
 *
 * Only published stories are served. Anyone can submit one, but a submission
 * is never published by itself — the server ignores a `published` flag from
 * the client, and this page says so rather than implying the story is live.
 */
export default function Stories() {
  const { user, isAuthed } = useAuth();
  const [stories, setStories] = useState([]);
  const [fields, setFields] = useState([]);
  const [field, setField] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [sent, setSent] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    careerService.listFields().then(setFields).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    publicService
      .stories(field ? { field } : undefined)
      .then((s) => alive && setStories(s))
      .catch((e) => alive && setError(apiError(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [field]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await publicService.submitStory(form);
      setSent(res.message);
      setForm(null);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page wrap">
      <header className="page__head">
        <div>
          <p className="t-eyebrow">Arrivals</p>
          <h1 className="t-h2 page__title">People who got there</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)' }}>
            Real routes, including the parts that did not go to plan.
          </p>
        </div>
        <Button onClick={() => setForm({ ...EMPTY, name: user?.name || '' })}>
          Share your story
        </Button>
      </header>

      {sent && <p className="anotice" role="status">{sent}</p>}
      {error && <div className="auth__alert" role="alert">{error}</div>}

      <div className="hub__filters" role="group" aria-label="Filter by field">
        <button
          type="button"
          className={`hub__chip ${!field ? 'hub__chip--on' : ''}`}
          onClick={() => setField('')}
        >
          All routes
        </button>
        {fields.map((f) => (
          <button
            key={f.slug}
            type="button"
            className={`hub__chip ${field === f.slug ? 'hub__chip--on' : ''}`}
            onClick={() => setField(f.slug)}
          >
            {f.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-row"><span className="spinner" aria-hidden="true" /> Loading…</div>
      ) : stories.length === 0 ? (
        <p className="hub__empty">
          No published stories yet. Submitted stories appear here once an administrator
          approves them.
        </p>
      ) : (
        <div className="hub__grid">
          {stories.map((s) => (
            <article className="hub__card hub__card--story" key={s._id}>
              <div className="hub__body">
                <span className="hub__kind">{s.career?.field?.name || 'Career'}</span>
                <h2 className="hub__title">{s.headline}</h2>
                <p className="hub__who">
                  {s.name}
                  {s.career?.title || s.roleTitle ? ` · ${s.career?.title || s.roleTitle}` : ''}
                </p>
                <p className="hub__text hub__text--story">{s.story}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {form && (
        <div className="amodal" role="dialog" aria-modal="true" aria-label="Share your story">
          <button type="button" className="amodal__scrim" onClick={() => setForm(null)} aria-label="Close" />
          <form className="amodal__box" onSubmit={submit}>
            <header className="amodal__head">
              <h3 className="amodal__title">Share your story</h3>
            </header>
            <div className="amodal__body">
              <label className="af">
                <span className="af__label">Your name</span>
                <input
                  className="af__input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label className="af">
                <span className="af__label">Headline</span>
                <input
                  className="af__input"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  required
                  placeholder="What you achieved, in one line"
                />
              </label>
              <label className="af">
                <span className="af__label">Role you reached</span>
                <input
                  className="af__input"
                  value={form.roleTitle}
                  onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
                />
              </label>
              <label className="af">
                <span className="af__label">Your story</span>
                <textarea
                  className="af__input"
                  rows={7}
                  value={form.story}
                  onChange={(e) => setForm({ ...form, story: e.target.value })}
                  required
                  placeholder="Where you started, what got in the way, how it went."
                />
              </label>
              <p className="af__hint">
                An administrator reviews this before it appears.{' '}
                {isAuthed
                  ? 'It will be linked to your passport.'
                  : 'You are not signed in, so it will be posted under the name you gave.'}
              </p>
            </div>
            <footer className="amodal__foot">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" loading={busy} disabled={busy}>Submit for review</Button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
