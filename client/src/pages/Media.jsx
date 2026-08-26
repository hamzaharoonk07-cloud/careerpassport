import { useEffect, useState } from 'react';
import { publicService } from '../services/public.service.js';
import { apiError } from '../services/api.js';
import '../styles/hub.css';

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
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            Talks, walkthroughs and guides, tagged by an administrator.
          </p>
        </div>
      </header>

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
          Nothing here yet. An administrator adds items from the control tower, and they appear here immediately.
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
    </div>
  );
}
