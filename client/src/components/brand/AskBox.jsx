import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../primitives/Button.jsx';
import { api, apiError } from '../../services/api.js';

const EXAMPLES = [
  'I like maths but I hate presenting',
  'I want to help people and I am good with detail',
  'I love building things with my hands, not office work',
];

/**
 * Ask in your own words.
 *
 * For the person who will not sit through ten questions, or who already
 * knows something about themselves and wants to start there. No model
 * behind it — it reads the sentence against the careers in the database,
 * so it works offline and cannot name a job that does not exist.
 *
 * It says what it understood, including what it took as a dislike. If the
 * reading is wrong the reader can see why immediately, rather than being
 * handed a list with no way to judge it.
 */
export function AskBox() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = async (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/ask', { text });
      setResult(data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ask">
      <form className="ask__form" onSubmit={ask}>
        <label className="af__label" htmlFor="ask-text">Or just say what you are like</label>
        <div className="ask__row">
          <input
            id="ask-text"
            className="af__input ask__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I like maths but I hate presenting…"
            maxLength={600}
          />
          <Button type="submit" loading={busy} disabled={busy || !text.trim()}>Match me</Button>
        </div>

        <div className="ask__examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="ask__example"
              onClick={() => setText(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && <div className="auth__alert" role="alert">{error}</div>}

      {result && (
        <div className="ask__out" aria-live="polite">
          {/* What it took from the sentence. A match nobody can trace is not
              much better than a guess. */}
          {(result.read.understood.length > 0 || result.read.avoiding.length > 0) && (
            <p className="ask__read">
              {result.read.understood.length > 0 && (
                <>Reading that as: <strong>{result.read.understood.join(', ')}</strong>. </>
              )}
              {result.read.avoiding.length > 0 && (
                <>Avoiding: <strong>{result.read.avoiding.join(', ')}</strong>.</>
              )}
            </p>
          )}

          {result.matches.length === 0 ? (
            <p className="ask__none">
              Nothing in that we could match on. Try naming a subject you like, or something
              you would rather not do — or take the passport quiz, which asks properly.
            </p>
          ) : (
            <ul className="ask__list">
              {result.matches.map((m) => (
                <li className="ask__hit" key={m.career._id}>
                  <div className="ask__hit-top">
                    <Link to={`/careers/${m.career.slug}`} className="ask__hit-title">
                      {m.career.title}
                    </Link>
                    <span className="ask__hit-strength">{m.strength}</span>
                  </div>
                  <p className="ask__hit-field">{m.career.field?.name}</p>
                  <p className="ask__hit-why">{m.reasons[0]}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="ask__foot">
            This reads your sentence against the careers we hold. It is a starting point,
            not a measurement — <Link to="/register">the quiz</Link> is the one that scores you.
          </p>
        </div>
      )}
    </section>
  );
}
