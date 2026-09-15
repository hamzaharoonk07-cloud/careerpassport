import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { publicService } from '../services/public.service.js';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/hub.css';
import '../styles/stories.css';
import { FieldIcon } from '../components/brand/FieldIcon.jsx';

const EMPTY = { name: '', headline: '', story: '', roleTitle: '', imageUrl: '' };

const STOPS = [
  { key: 'path', label: 'Departed' },
  { key: 'challenges', label: 'Turbulence' },
  { key: 'outcome', label: 'Landed' },
];

/**
 * Which field a story belongs to.
 *
 * A story linked to a career carries its field. Older and seeded stories only
 * have the role they reached, so that is matched against the career bank, but
 * only when one clearly names the other ("UX Designer" in "UI/UX Designer",
 * "Healthcare" in "Healthcare Data Specialist"). A role that matches nothing
 * is left without a field rather than guessed into one.
 */
function fieldOf(story, careers, fields) {
  if (story.career?.field?.slug) return fields.find((f) => f.slug === story.career.field.slug) || null;
  const role = (story.roleTitle || '').toLowerCase().trim();
  if (!role) return null;
  const career = careers.find((c) => {
    const t = c.title.toLowerCase();
    return t === role || t.includes(role) || role.includes(t);
  });
  if (career?.field?.slug) return fields.find((f) => f.slug === career.field.slug) || null;
  return fields.find((f) => role.includes(f.name.toLowerCase())) || null;
}

function Route({ story, vertical = false }) {
  const stops = STOPS.filter((st) => story[st.key]);
  if (!stops.length) return null;
  return (
    <ol className={`sroute ${vertical ? 'sroute--v' : ''}`}>
      {stops.map((st, i) => (
        <li key={st.key} className={`sroute__stop ${i === stops.length - 1 ? 'sroute__stop--end' : ''}`}>
          <span className="sroute__dot" aria-hidden="true">
            {i === stops.length - 1 ? (
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-5z" transform="rotate(90 12 12)" /></svg>
            ) : null}
          </span>
          <span className="sroute__k">{st.label}</span>
          <p className="sroute__v">{story[st.key]}</p>
        </li>
      ))}
    </ol>
  );
}

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
  const [uploading, setUploading] = useState(false);
  const [careers, setCareers] = useState([]);
  const [openStory, setOpenStory] = useState(null);

  /* A picture with the story. Uploaded first, then carried on the submission
     as a URL — so an image and a story arrive as one moderated record. */
  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await publicService.uploadFile(file);
      setForm((f) => ({ ...f, imageUrl: res.url }));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Everything is loaded once and filtered here, so the tabs can show counts
  // and a story without a linked career can still be placed in its field.
  useEffect(() => {
    let alive = true;
    Promise.all([
      publicService.stories(),
      careerService.listFields().catch(() => []),
      careerService.list({ limit: 60 }).then((r) => r.careers || []).catch(() => []),
    ])
      .then(([st, fl, cs]) => {
        if (!alive) return;
        setStories(st);
        setFields(fl);
        setCareers(cs);
      })
      .catch((e) => alive && setError(apiError(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const placed = useMemo(
    () => stories.map((st) => ({ story: st, field: fieldOf(st, careers, fields) })),
    [stories, careers, fields]
  );
  const counts = useMemo(() => {
    const c = {};
    for (const p of placed) if (p.field) c[p.field.slug] = (c[p.field.slug] || 0) + 1;
    return c;
  }, [placed]);
  const shown = field ? placed.filter((p) => p.field?.slug === field) : placed;
  const [featured, ...rest] = shown;
  const careerFor = (st) =>
    st.career || careers.find((c) => c.title.toLowerCase() === (st.roleTitle || '').toLowerCase()) || null;

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
    <div className="page wrap stories">
      <header className="stories__head">
        <div>
          <h1 className="stories__title">Arrivals</h1>
          <p className="stories__lead">
            How other travellers got where they are going, including the parts that
            did not go to plan.
          </p>
        </div>
        <div className="stories__side">
          <dl className="stories__stats">
            <div><dt>Journeys</dt><dd>{stories.length}</dd></div>
            <div><dt>Fields</dt><dd>{Object.keys(counts).length}</dd></div>
          </dl>
          <Button size="lg" onClick={() => setForm({ ...EMPTY, name: user?.name || '' })}>
            Share your story
          </Button>
        </div>
      </header>

      {sent && <p className="anotice" role="status">{sent}</p>}
      {error && <div className="auth__alert" role="alert">{error}</div>}

      <div className="stories__tabs" role="group" aria-label="Filter by field">
        <button type="button" className="stories__tab" aria-pressed={!field} onClick={() => setField('')}>
          All journeys <span className="stories__count">{stories.length}</span>
        </button>
        {fields.map((f) => (
          <button
            key={f.slug}
            type="button"
            className="stories__tab"
            aria-pressed={field === f.slug}
            onClick={() => setField(f.slug)}
            style={{ '--accent': f.accent }}
          >
            <FieldIcon name={f.icon} size={16} />
            {f.name}
            <span className="stories__count">{counts[f.slug] || 0}</span>
          </button>
        ))}
      </div>

      <p className="stories__note">
        Journeys are told by stage and city rather than by name. Stories you send in
        are published once an administrator has read them.
      </p>

      {loading ? (
        <div className="loading-row"><span className="spinner" aria-hidden="true" /> Loading…</div>
      ) : shown.length === 0 ? (
        <div className="stories__empty">
          <h2>No journeys in this field yet</h2>
          <p>If you have been through it, yours could be the first one here.</p>
          <Button variant="secondary" onClick={() => setForm({ ...EMPTY, name: user?.name || '' })}>Share your story</Button>
        </div>
      ) : (
        <>
          {featured && (
            <article className="sfeat" style={{ '--accent': featured.field?.accent || 'var(--gold-500)' }}>
              <div className="sfeat__main">
                <p className="sfeat__tag">
                  {featured.field && <FieldIcon name={featured.field.icon} size={16} />}
                  {featured.field?.name || 'Journey'}
                  {featured.story.roleTitle && <span className="sfeat__role">Landed as {featured.story.roleTitle}</span>}
                </p>
                <h2 className="sfeat__headline">{featured.story.headline}</h2>
                <p className="sfeat__who">{featured.story.name}</p>
                <blockquote className="sfeat__quote">{featured.story.story}</blockquote>
                {careerFor(featured.story)?.slug && (
                  <Link to={`/careers/${careerFor(featured.story).slug}`} className="sfeat__link">
                    Explore {careerFor(featured.story).title}
                  </Link>
                )}
              </div>
              <aside className="sfeat__route" aria-label="Their route">
                <Route story={featured.story} vertical />
              </aside>
            </article>
          )}

          {rest.length > 0 && (
            <div className="scards">
              {rest.map(({ story: st, field: f }) => {
                const expanded = openStory === st._id;
                const career = careerFor(st);
                return (
                  <article key={st._id} className="scard" style={{ '--accent': f?.accent || 'var(--gold-500)' }}>
                    <header className="scard__band">
                      <span className="scard__field">
                        {f && <FieldIcon name={f.icon} size={15} />}
                        {f?.name || 'Journey'}
                      </span>
                      {st.roleTitle && <span className="scard__role">Landed as {st.roleTitle}</span>}
                    </header>
                    <div className="scard__body">
                      <h2 className="scard__headline">{st.headline}</h2>
                      <p className="scard__who">{st.name}</p>
                      {st.path || st.challenges || st.outcome
                        ? <Route story={st} />
                        : <p className="scard__text">{st.story}</p>}
                      {expanded && (st.path || st.challenges || st.outcome) && (
                        <blockquote className="scard__full">{st.story}</blockquote>
                      )}
                      <footer className="scard__foot">
                        {(st.path || st.challenges || st.outcome) && (
                          <button
                            type="button"
                            className="scard__more"
                            onClick={() => setOpenStory(expanded ? null : st._id)}
                            aria-expanded={expanded}
                          >
                            {expanded ? 'Show less' : 'Read the whole story'}
                          </button>
                        )}
                        {career?.slug && (
                          <Link to={`/careers/${career.slug}`} className="scard__career">{career.title}</Link>
                        )}
                      </footer>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="stories__cta">
            <div>
              <h2>Been through it?</h2>
              <p>Where you started, what got in the way and where you landed is exactly what the next traveller needs.</p>
            </div>
            <Button size="lg" onClick={() => setForm({ ...EMPTY, name: user?.name || '' })}>Share your story</Button>
          </section>
        </>
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
            <div className="af">
                <span className="af__label">Photograph (optional)</span>
                <label className="acct__pick">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={pickImage}
                    disabled={uploading}
                  />
                  <span>{uploading ? 'Uploading…' : form.imageUrl ? 'Replace image' : 'Choose an image'}</span>
                </label>
                {form.imageUrl && (
                  <img
                    src={form.imageUrl}
                    alt=""
                    style={{ marginTop: 'var(--sp-2)', maxHeight: 120, borderRadius: 'var(--r-md)' }}
                  />
                )}
                <span className="af__hint">Up to 2 MB. You need an account to upload.</span>
              </div>
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
