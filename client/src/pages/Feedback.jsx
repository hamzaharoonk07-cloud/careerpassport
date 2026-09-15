import { useEffect, useState } from 'react';
import { Button } from '../components/primitives/Button.jsx';
import { publicService } from '../services/public.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/hub.css';
import '../styles/feedback.css';

const TYPES = [
  { id: 'bug', label: 'Something is broken', note: 'A page, a button, a wrong number',
    icon: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.2v.3" /></> },
  { id: 'suggestion', label: 'An idea', note: 'Something that would make this better',
    icon: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></> },
  { id: 'query', label: 'A question', note: 'Something you could not work out',
    icon: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.8M12 17v.3" /></> },
  { id: 'praise', label: 'Something worked', note: 'What helped, so we keep it',
    icon: <path d="M12 20.5s-8-4.7-8-10.4A4.4 4.4 0 0 1 12 7.5a4.4 4.4 0 0 1 8 2.6c0 5.7-8 10.4-8 10.4z" /> },
];

const RATING_WORDS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];

/** Status words a traveller understands, not the admin queue's. */
const STATUS_LABEL = { new: 'Sent', read: 'Read', reviewed: 'Read', resolved: 'Answered', replied: 'Answered', closed: 'Closed' };

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
        ...(isAuthed ? {} : { name }),
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
    <div className="page wrap fbk">
      <div className="fbk__layout">
        <section className="fbk__intro">
          <h1 className="fbk__title">How was your flight?</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)' }}>
            Tell us what broke, what confused you, or what helped. Say it plainly; that is
            more useful to us than being polite.
          </p>

          <ol className="fbk__steps">
            <li>
              <span className="fbk__step-n" aria-hidden="true">1</span>
              <span><strong>You fill in the card.</strong> It takes a minute.</span>
            </li>
            <li>
              <span className="fbk__step-n" aria-hidden="true">2</span>
              <span><strong>An administrator reads it.</strong> Every card reaches a person.</span>
            </li>
            <li>
              <span className="fbk__step-n" aria-hidden="true">3</span>
              <span>
                <strong>The reply appears on this page.</strong>{' '}
                {isAuthed ? 'Under your card, below.' : 'Sign in first if you want to see it.'}
              </span>
            </li>
          </ol>
        </section>

        <form className="fbk__card" onSubmit={submit}>
          <header className="fbk__card-head">
            <span className="fbk__card-title">Passenger comment card</span>
            <span className="fbk__card-no">{isAuthed ? user.passportNumber : 'Guest'}</span>
          </header>

          {sent && <p className="fbk__sent" role="status">{sent}</p>}
          {error && <div className="auth__alert" role="alert">{error}</div>}

          <fieldset className="fbk__group">
            <legend className="fbk__label">What kind of feedback is this?</legend>
            <div className="fbk__types">
              {TYPES.map((t) => (
                <label key={t.id} className={`fbk__type ${type === t.id ? 'fbk__type--on' : ''}`}>
                  <input
                    type="radio"
                    name="type"
                    value={t.id}
                    checked={type === t.id}
                    onChange={() => setType(t.id)}
                    className="sr-only"
                  />
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {t.icon}
                  </svg>
                  <span className="fbk__type-l">{t.label}</span>
                  <span className="fbk__type-n">{t.note}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="fbk__group">
            <legend className="fbk__label">How was it overall?</legend>
            <div className="fbk__rating">
              {RATING_WORDS.map((word, i) => {
                const n = i + 1;
                return (
                  <label key={n} className={`fbk__rate ${n === rating ? 'fbk__rate--on' : ''} ${n < rating ? 'fbk__rate--below' : ''}`}>
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      checked={n === rating}
                      onChange={() => setRating(n)}
                      className="sr-only"
                    />
                    <span className="fbk__rate-n">{n}</span>
                    <span className="fbk__rate-w">{word}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="fbk__group">
            <span className="fbk__label">What happened?</span>
            <textarea
              className="fbk__input"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="Where you were, what you expected, and what happened instead."
            />
          </label>

          {!isAuthed && (
            <label className="fbk__group">
              <span className="fbk__label">Your name</span>
              <input className="fbk__input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          <footer className="fbk__card-foot">
            <span className="fbk__from">
              {isAuthed ? <>Sent as <strong>{user.name}</strong></> : 'Sending as a guest'}
            </span>
            <Button type="submit" size="lg" loading={busy} disabled={busy || !message.trim()}>
              Send feedback
            </Button>
          </footer>
        </form>
      </div>

      {isAuthed && mine.length > 0 && (
        <section className="fbk__mine">
          <h2 className="fbk__mine-h">Your cards</h2>
          <p className="t-mid">Replies from an administrator appear under each one.</p>

          <div className="fbk__stubs">
            {mine.map((f) => {
              const t = TYPES.find((x) => x.id === f.type);
              return (
                <article className="fbk__stub" key={f._id}>
                  <div className="fbk__stub-side">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {t?.icon}
                    </svg>
                    <span className="fbk__stub-rating" aria-label={`Rated ${f.rating} out of 5`}>{f.rating}/5</span>
                  </div>
                  <div className="fbk__stub-main">
                    <div className="fbk__stub-top">
                      <span className="fbk__stub-type">{t?.label || f.type}</span>
                      <span className={`fbk__status ${f.reply?.message ? 'fbk__status--done' : ''}`}>
                        {f.reply?.message ? 'Answered' : STATUS_LABEL[f.status] || f.status}
                      </span>
                    </div>
                    <p className="fbk__stub-msg">{f.message}</p>
                    {f.reply?.message ? (
                      <div className="fbk__reply">
                        <span className="fbk__reply-from">Reply from PathSeeker</span>
                        <p>{f.reply.message}</p>
                      </div>
                    ) : (
                      <p className="fbk__noreply">No reply yet.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
