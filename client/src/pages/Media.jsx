import { useEffect, useState } from 'react';
import { Button } from '../components/primitives/Button.jsx';
import { publicService } from '../services/public.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/hub.css';

/** What a visitor may send in. `Everything` is a filter, not a kind. */
const SUBMIT_KINDS = [
  { id: 'video', label: 'Video' },
  { id: 'image', label: 'Image' },
  { id: 'document', label: 'Document' },
  { id: 'link', label: 'Link' },
];

const EMPTY = { title: '', description: '', kind: 'link', url: '' };

const KINDS = [
  { id: '', label: 'Everything' },
  { id: 'video', label: 'Video' },
  { id: 'image', label: 'Image' },
  { id: 'document', label: 'Document' },
  { id: 'link', label: 'Link' },
];

/**
 * The multimedia centre.
 *
 * Only active items are served. A video is played inline with controls; a
 * document or link opens in a new tab on an explicit click, never
 * automatically — the brief is clear that nothing should download itself.
 */
export default function Media() {
  const { isAuthed } = useAuth();
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Submission state, kept apart from the page's own load/error so a failed
  // send never blanks the centre behind the form.
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);

  /* Upload fills in the URL field rather than replacing it: the centre stores
     links either way, so a file and a link end up as the same kind of record
     and the moderation queue does not have to care which it was. */
  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError('');
    try {
      const res = await publicService.uploadFile(file);
      setForm((f) => ({ ...f, url: res.url, kind: res.kind, title: f.title || file.name.replace(/\.[^.]+$/, '') }));
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const res = await publicService.submitMedia(form);
      setSent(res.message || 'Thank you — an administrator reviews it before it appears.');
      setForm(null);
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    publicService.media(kind ? { kind } : undefined)
      .then((m) => alive && setItems(m))
      .catch((e) => alive && setError(apiError(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [kind]);

  return (
    <div className="page wrap">
      <header className="page__head">
        <div>
          <p className="t-eyebrow">In-flight entertainment</p>
          <h1 className="t-h2 page__title">Multimedia centre</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)' }}>
            Talks, walkthroughs and guides. Send one in and an administrator
            reviews it before it appears here.
          </p>
        </div>
        <Button onClick={() => { setSent(''); setForm({ ...EMPTY }); }}>
          Share something
        </Button>
      </header>

      {sent && <p className="anotice" role="status">{sent}</p>}

      <div className="hub__filters" role="group" aria-label="Filter by kind">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`hub__chip ${kind === k.id ? 'hub__chip--on' : ''}`}
            onClick={() => setKind(k.id)}
            aria-pressed={kind === k.id}
          >
            {k.label}
          </button>
        ))}
      </div>

      {error && <div className="auth__alert" role="alert">{error}</div>}

      {loading ? (
        <div className="loading-row"><span className="spinner" aria-hidden="true" /> Loading…</div>
      ) : items.length === 0 ? (
        <p className="hub__empty">
          Nothing here yet. Send something in, or wait for an administrator to add it — either way it appears here once it is approved.
        </p>
      ) : (
        <div className="hub__grid">
          {items.map((m) => (
            <article className="hub__card" key={m._id}>
              {m.kind === 'video' ? (
                <video className="hub__media" controls preload="none" poster={m.thumbnailUrl || undefined}>
                  <source src={m.url} type="video/mp4" />
                </video>
              ) : m.kind === 'image' ? (
                <img className="hub__media" src={m.url} alt={m.title} loading="lazy" />
              ) : null}

              <div className="hub__body">
                <span className="hub__kind">{m.kind}</span>
                <h2 className="hub__title">{m.title}</h2>
                {m.description && <p className="hub__text">{m.description}</p>}
                {(m.career || m.field) && (
                  <p className="hub__tag">{m.career?.title || m.field?.name}</p>
                )}
                {(m.kind === 'document' || m.kind === 'link') && (
                  // Explicit click, new tab, and rel guards against the opener
                  // being reachable from the destination.
                  <a className="hub__open" href={m.url} target="_blank" rel="noreferrer noopener">
                    Open {m.kind} →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {form && (
        <div className="amodal" role="dialog" aria-modal="true" aria-label="Share something">
          <button type="button" className="amodal__scrim" onClick={() => setForm(null)} aria-label="Close" />
          <form className="amodal__box" onSubmit={submit}>
            <div className="amodal__head">
              <h3 className="amodal__title">Share something</h3>
              <button type="button" className="amodal__x" onClick={() => setForm(null)} aria-label="Close">&times;</button>
            </div>

            <div className="amodal__body">
              {formError && <div className="auth__alert" role="alert">{formError}</div>}

              <div className="af">
                <label className="af__label" htmlFor="md-title">Title</label>
                <input
                  id="md-title" className="af__input" required maxLength={140}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="A walkthrough of a real deployment"
                />
              </div>

              <div className="af">
                <label className="af__label" htmlFor="md-kind">What kind of item is it?</label>
                <select
                  id="md-kind" className="af__input"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  {SUBMIT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>

              <div className="af">
                <label className="af__label" htmlFor="md-url">Link</label>
                <input
                  id="md-url" className="af__input" required type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com/the-talk"
                />
                {/* The centre stores links rather than files, so this is the
                    whole item. The server accepts http and https only. */}
                <span className="af__hint">A full https:// address to something already online.</span>
                <label className="acct__pick" style={{ marginTop: 'var(--sp-2)' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    onChange={pickFile}
                    disabled={uploading}
                  />
                  <span>{uploading ? 'Uploading…' : 'or upload a file'}</span>
                </label>
                <span className="af__hint">
                  Images up to 2 MB, video up to 12 MB. You need an account to upload.
                </span>
              </div>

              <div className="af">
                <label className="af__label" htmlFor="md-desc">What is it? (optional)</label>
                <textarea
                  id="md-desc" className="af__input" rows={3} maxLength={600}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="One or two lines on why it is worth someone's time."
                />
              </div>

              <p className="af__hint">
                {isAuthed
                  ? 'It will be linked to your passport.'
                  : 'You are not signed in, so it will be sent anonymously.'}
                {' '}Nothing appears in the centre until an administrator approves it.
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
