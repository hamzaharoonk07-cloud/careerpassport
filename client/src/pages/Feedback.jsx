import { useEffect, useState } from 'react';
import { Button } from '../components/primitives/Button.jsx';
import { publicService } from '../services/public.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/hub.css';

const TYPES = [
  { id: 'bug', label: 'Something is broken', note: 'A page, a button, a wrong number' },
  { id: 'suggestion', label: 'An idea', note: 'Something that would make this better' },
  { id: 'query', label: 'A question', note: 'Something you could not work out' },
  { id: 'praise', label: 'Something worked', note: 'What helped, so we keep it' },
];

/**
 * Feedback.
 *
 * An admin could review feedback before this page existed, but nobody could
 * leave any — the loop had no opening. Categorised, because a bug report and
 * a feature idea need different handling.
 */
export default function Feedback() {
  const { user, isAuthed } = useAuth();
  const [type, setType] = useState('suggestion');
  const [rating, setRating] = useState(4);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState([]);

  // Your own submissions and any answers to them. Without this an
  // administrator replies into a void — the reply exists but the person who
  // asked never sees it.
  const loadMine = () => {
    if (!isAuthed) return;
    publicService.myFeedback().then(setMine).catch(() => { /* not fatal */ });
  };
  useEffect(loadMine, [isAuthed]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await publicService.submitFeedback({
        type,
        rating,
        message,
        context: window.location.pathname,
        ...(isAuthed ? {} : { name, email }),
      });
      setSent(res.message);
      setMessage('');
      loadMine();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page wrap-narrow">
      <header className="page__head">
        <div>
          <p className="t-eyebrow">Tell us</p>
          <h1 className="t-h2 page__title">Feedback</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)' }}>
            This reaches an administrator directly. Say what happened plainly — it is more
            useful than being polite.
          </p>
        </div>
      </header>

      {sent && <p className="anotice" role="status">{sent}</p>}
      {error && <div className="auth__alert" role="alert">{error}</div>}

      <form className="hub__form" onSubmit={submit}>
        <fieldset className="hub__types">
          <legend className="af__label">What kind of feedback is this?</legend>
          <div className="hub__types-row">
            {TYPES.map((t) => (
              <label key={t.id} className={`hub__type ${type === t.id ? 'hub__type--on' : ''}`}>
                <input
                  type="radio"
                  name="type"
                  value={t.id}
                  checked={type === t.id}
                  onChange={() => setType(t.id)}
                />
                <span className="hub__type-l">{t.label}</span>
                <span className="hub__type-n">{t.note}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="af">
          <span className="af__label">How was it overall?</span>
          <div className="hub__stars" role="group" aria-label="Rating out of five">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`hub__star ${n <= rating ? 'hub__star--on' : ''}`}
                onClick={() => setRating(n)}
                aria-label={`${n} out of 5`}
                aria-pressed={n === rating}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <label className="af">
          <span className="af__label">What happened?</span>
          <textarea
            className="af__input"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            placeholder="Where you were, what you expected, what happened instead."
          />
        </label>

        {!isAuthed && (
          <>
            <label className="af">
              <span className="af__label">Your name</span>
              <input className="af__input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="af">
              <span className="af__label">Email for a reply</span>
              <input
                className="af__input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </>
        )}

        {isAuthed && <p className="af__hint">Sent as {user.name} · {user.passportNumber}.</p>}

        <div style={{ marginTop: 'var(--sp-5)' }}>
          <Button type="submit" size="lg" loading={busy} disabled={busy || !message.trim()}>
            Send feedback
          </Button>
        </div>
      </form>

      {isAuthed && mine.length > 0 && (
        <section className="hub__mine">
          <h2 className="apanel__title">What you have sent</h2>
          <p className="apanel__sub">Replies from an administrator appear here.</p>

          <div className="acards" style={{ marginTop: 'var(--sp-4)' }}>
            {mine.map((f) => (
              <article className="acard" key={f._id}>
                <div className="acard__top">
                  <span className="atag">{f.type}</span>
                  <span className="acard__rating">{'★'.repeat(f.rating)}</span>
                  <span className={`atag ${f.status === 'new' ? '' : 'atag--on'}`}>{f.status}</span>
                </div>
                <p className="acard__body">{f.message}</p>
                {f.reply?.message ? (
                  <div className="acard__reply">
                    <span className="af__label">Reply from PathSeeker</span>
                    <p>{f.reply.message}</p>
                  </div>
                ) : (
                  <p className="af__hint" style={{ marginTop: 'var(--sp-3)' }}>
                    No reply yet.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
