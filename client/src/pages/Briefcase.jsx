import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/primitives/Button.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { quizService } from '../services/quiz.service.js';
import { apiError } from '../services/api.js';
import { formatSalary } from './Result.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import '../styles/briefcase.css';

/** Twelve notes, deterministic scatter. Enough to read as money, not a jackpot. */
const NOTE_COUNT = 12;

export default function Briefcase() {
  const { user } = useAuth();
  const { advance } = useJourney();
  const reduced = useReducedMotion();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    quizService
      .latestResult()
      .then((r) => alive && setResult(r))
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const notes = useMemo(
    () =>
      Array.from({ length: NOTE_COUNT }, (_, i) => ({
        nx: `${(i % 6) * 22 - 55}px`,
        ny: `${-90 - (i % 4) * 42}px`,
        nr: `${(i % 2 ? 1 : -1) * (25 + i * 9)}deg`,
        delay: `${520 + i * 70}ms`,
      })),
    []
  );

  const openCase = () => {
    setUnlocked(true);
    setTimeout(() => {
      setOpen(true);
      advance('complete');
    }, reduced ? 0 : 480);
  };

  if (loading) {
    return <main className="bc"><p className="t-low">Fetching your case…</p></main>;
  }

  const top = result?.matches?.[0];
  const career = top?.career;
  const salary = career ? formatSalary(career.salary) : null;

  return (
    <main className={`bc ${unlocked ? 'bc--unlocked' : ''} ${open ? 'bc--open' : ''}`}>
      <div className="bc__inner">
        <header className="bc__head">
          <p className="t-eyebrow">The last page</p>
          <h1 className="t-h2 bc__title">
            {open ? 'Your future is worth carrying.' : 'One thing left.'}
          </h1>
          {!open && (
            <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
              Everything you have decided today goes in here. Open it.
            </p>
          )}
        </header>

        <div className="bc__stage">
          {/* The opening clip only makes sense once the user has opened it —
              before that the CSS case is the interactive object. */}
          {open && (
            <SceneVideo
              src="/videos/briefcase.mp4"
              poster="/images/briefcase.jpg"
              overlay={false}
              fit="contain"
              className="bc__video"
            />
          )}
          <div className="bc__case">
            <div className="bc__body">
              <span className="bc__stitch" />
            </div>

            <span className="bc__glow" aria-hidden="true" />

            <div className="bc__contents">
              {career ? (
                <>
                  <span className="bc__contents-role">{career.title}</span>
                  <span className="bc__contents-sub">{top.score}% match · {career.field?.name}</span>
                </>
              ) : (
                <span className="bc__contents-sub">Take the quiz to fill this case</span>
              )}
            </div>

            <div className="bc__notes" aria-hidden="true">
              {notes.map((n, i) => (
                <span
                  key={i}
                  className="note"
                  style={{ '--nx': n.nx, '--ny': n.ny, '--nr': n.nr, animationDelay: n.delay }}
                />
              ))}
            </div>

            <div className="bc__lid">
              <span className="bc__plate">{user?.passportNumber || 'PATHSEEKER'}</span>
            </div>
            <span className="bc__lock" aria-hidden="true" />
          </div>
        </div>

        {!open ? (
          <Button size="lg" onClick={openCase}>Open your future</Button>
        ) : (
          <div className="bc__payoff anim-rise">
            <div className="bc__value">
              <span className="bc__value-k">What this path is worth</span>
              {salary ? (
                <>
                  <span className="bc__value-v">{salary}</span>
                  {career?.salary?.source && <span className="bc__value-note">{career.salary.source}</span>}
                </>
              ) : (
                /* No verified figure for this career — say the true thing instead
                   of estimating one. */
                <>
                  <span className="bc__value-v">Your potential grows with your skills.</span>
                  <span className="bc__value-note">
                    We do not hold verified salary data for {career?.title || 'this path'}.
                  </span>
                </>
              )}
            </div>

            {error && <p className="t-low">{error}</p>}

            <div className="bc__actions">
              <Button size="lg" to="/dashboard">Go to your dashboard</Button>
              <Button variant="secondary" to="/careers">Explore the career bank</Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
