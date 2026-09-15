import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/primitives/Button.jsx';
import { publicService } from '../services/public.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/hub.css';
import '../styles/media.css';

/** What a visitor may send in. `Everything` is a filter, not a kind. */
const SUBMIT_KINDS = [
  { id: 'video', label: 'Video' },
  { id: 'image', label: 'Image' },
  { id: 'document', label: 'Document' },
  { id: 'link', label: 'Link' },
];

const EMPTY = { title: '', description: '', kind: 'link', url: '' };

/** The channels on the seat-back screen. `Everything` is a filter, not a kind. */
const KINDS = [
  { id: '', label: 'All channels' },
  { id: 'video', label: 'Videos' },
  { id: 'image', label: 'Images' },
  { id: 'document', label: 'Documents' },
  { id: 'link', label: 'Links' },
];

/**
 * Shown on the big screen until anyone shares a video: the site's own
 * journey film, which really is on this server. The screen is the page, so
 * it should never be switched off.
 */
const HOUSE_FILM = {
  _id: 'house-film',
  kind: 'video',
  title: 'The PathSeeker journey',
  description: 'The film behind the site: a passport issued, a gate chosen, a flight, and an arrival.',
  url: '/videos/journey.mp4',
  thumbnailUrl: '/images/journey.jpg',
  house: true,
};

const KIND_ICON = {
  video: <path d="M4 6.5h11a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5zM16.5 10.5l5-3v9l-5-3" />,
  image: <><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m3.5 18 5.5-5 4 3.5 3-2.5 4.5 4" /></>,
  document: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 12h6M9.5 15.5h6" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
};

function KindIcon({ kind, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {KIND_ICON[kind] || KIND_ICON.link}
    </svg>
  );
}

const hostOf = (url) => {
  try { return new URL(url, window.location.origin).hostname.replace(/^www\./, ''); } catch { return ''; }
};

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
  const [nowPlaying, setNowPlaying] = useState(null);
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

  // Loaded once and filtered here, so every channel tab can show its count.
  useEffect(() => {
    let alive = true;
    publicService.media()
      .then((m) => alive && setItems(m))
      .catch((e) => alive && setError(apiError(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const counts = useMemo(() => {
    const c = { '': items.length };
    for (const m of items) c[m.kind] = (c[m.kind] || 0) + 1;
    return c;
  }, [items]);

  const shown = kind ? items.filter((m) => m.kind === kind) : items;
  const playable = items.filter((m) => m.kind === 'video' || m.kind === 'image');
  const featured = nowPlaying || playable.find((m) => m.kind === 'video') || playable[0] || HOUSE_FILM;
  const upNext = [...playable, ...(featured.house ? [] : [HOUSE_FILM])]
    .filter((m) => m._id !== featured._id)
    .slice(0, 4);

  const play = (m) => {
    setNowPlaying(m);
    document.querySelector('.ife__screen')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page wrap ife">
      <header className="ife__head">
        <div>
          <h1 className="ife__title">In-flight entertainment</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-3)' }}>
            Talks, walkthroughs and guides about the careers on the board. Anyone can share
            one; an administrator checks it before it goes on air.
          </p>
        </div>
        <Button size="lg" onClick={() => { setSent(''); setForm({ ...EMPTY }); }}>
          Share something
        </Button>
      </header>

      {sent && <p className="anotice" role="status">{sent}</p>}
      {error && <div className="auth__alert" role="alert">{error}</div>}

      {/* ── The seat-back screen ─────────────────────────── */}
      <section className="ife__screen" aria-label="Now playing">
        <div className="ife__player">
          {featured.kind === 'video' ? (
            <video
              key={featured._id}
              className="ife__video"
              controls
              preload="metadata"
              poster={featured.thumbnailUrl || undefined}
            >
              <source src={featured.url} type="video/mp4" />
            </video>
          ) : (
            <img key={featured._id} className="ife__video" src={featured.url} alt={featured.title} />
          )}
          <div className="ife__caption">
            <span className="ife__live">Now playing</span>
            <h2 className="ife__now">{featured.title}</h2>
            {featured.description && <p className="ife__desc">{featured.description}</p>}
            {(featured.career || featured.field) && (
              <p className="ife__about">About {featured.career?.title || featured.field?.name}</p>
            )}
          </div>
        </div>

        <aside className="ife__next">
          <h3 className="ife__next-h">Up next</h3>
          {upNext.length === 0 ? (
            <div className="ife__next-empty">
              <p>Nothing else on air yet. Good things to share:</p>
              <ul className="ife__ideas">
                <li>A day in the life of someone in a career on the board</li>
                <li>A walkthrough of a course or certification</li>
                <li>An interview about how someone got their first job</li>
              </ul>
              <Button size="sm" variant="secondary" onClick={() => { setSent(''); setForm({ ...EMPTY, kind: 'video' }); }}>
                Share a video
              </Button>
            </div>
          ) : (
            <ul className="ife__queue">
              {upNext.map((m) => (
                <li key={m._id}>
                  <button type="button" className="ife__qitem" onClick={() => play(m)}>
                    <span className="ife__qthumb">
                      {m.thumbnailUrl || m.kind === 'image'
                        ? <img src={m.thumbnailUrl || m.url} alt="" loading="lazy" />
                        : <KindIcon kind={m.kind} />}
                    </span>
                    <span className="ife__qtext">
                      <span className="ife__qtitle">{m.title}</span>
                      <span className="ife__qkind">{m.kind === 'video' ? 'Video' : 'Image'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      {/* ── Channels ─────────────────────────────────────── */}
      <div className="ife__channels" role="group" aria-label="Filter by kind">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className="ife__channel"
            onClick={() => setKind(k.id)}
            aria-pressed={kind === k.id}
          >
            {k.id ? <KindIcon kind={k.id} size={18} /> : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
              </svg>
            )}
            <span>{k.label}</span>
            <span className="ife__count">{counts[k.id] || 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-row"><span className="spinner" aria-hidden="true" /> Loading the programme…</div>
      ) : shown.length === 0 ? (
        <div className="ife__empty">
          <span className="ife__empty-icon"><KindIcon kind={kind || 'video'} size={30} /></span>
          <h2 className="ife__empty-h">
            {kind ? `No ${KINDS.find((k) => k.id === kind).label.toLowerCase()} on this channel yet` : 'The programme is empty'}
          </h2>
          <p>Share a talk, a walkthrough or a guide you found useful. It goes on air once an administrator approves it.</p>
          <Button variant="secondary" onClick={() => { setSent(''); setForm({ ...EMPTY, kind: kind || 'link' }); }}>
            Share something
          </Button>
        </div>
      ) : (
        <div className="ife__grid">
          {shown.map((m) => {
            const onScreen = m.kind === 'video' || m.kind === 'image';
            const inner = (
              <>
                <span className={`ife__tile ife__tile--${m.kind}`}>
                  {m.kind === 'image' || m.thumbnailUrl ? (
                    <img src={m.thumbnailUrl || m.url} alt="" loading="lazy" />
                  ) : (
                    <KindIcon kind={m.kind} size={40} />
                  )}
                  {m.kind === 'video' && <span className="ife__play" aria-hidden="true" />}
                </span>
                <span className="ife__cbody">
                  <span className="ife__ckind"><KindIcon kind={m.kind} size={14} /> {m.kind}</span>
                  <span className="ife__ctitle">{m.title}</span>
                  {m.description && <span className="ife__ctext">{m.description}</span>}
                  <span className="ife__cfoot">
                    {m.career?.title || m.field?.name || (!onScreen && hostOf(m.url)) || ''}
                    <span className="ife__cgo">{onScreen ? 'Play on screen' : `Open ${m.kind}`}</span>
                  </span>
                </span>
              </>
            );
            // A video or image plays on the big screen; a document or link
            // opens in a new tab on an explicit click, never by itself.
            return onScreen ? (
              <button key={m._id} type="button" className="ife__card" onClick={() => play(m)}>{inner}</button>
            ) : (
              <a key={m._id} className="ife__card" href={m.url} target="_blank" rel="noreferrer noopener">{inner}</a>
            );
          })}
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
