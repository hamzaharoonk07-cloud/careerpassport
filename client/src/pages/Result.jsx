import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { quizService } from '../services/quiz.service.js';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { useJourney } from '../context/JourneyContext.jsx';
import '../styles/quiz.css';

/**
 * Formats a salary band from the database.
 *
 * Returns null when we hold no figure. Callers render
 * "Information not available." — we never estimate, never interpolate,
 * and never show a number the database did not give us.
 */
export function formatSalary(salary) {
  if (!salary) return null;
  const { entry, senior, currency = 'PKR', period = 'month' } = salary;
  if (entry == null && senior == null) return null;

  const fmt = (n) =>
    n >= 100000 ? `${(n / 1000).toFixed(0)}k` : new Intl.NumberFormat('en-PK').format(n);

  const range = entry != null && senior != null ? `${fmt(entry)} – ${fmt(senior)}` : fmt(entry ?? senior);
  return `${currency} ${range} / ${period}`;
}

const DEMAND_LABEL = { low: 'Low', moderate: 'Moderate', high: 'High', 'very-high': 'Very high' };

/** SVG progress ring for the match percentage. */
function MatchRing({ score, animate }) {
  const value = useCountUp(score, { duration: 1700, delay: 300, start: animate });
  const R = 62;
  const C = 2 * Math.PI * R;

  return (
    <div className="rs__ring">
      <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">
        <circle className="rs__ring-track" cx="75" cy="75" r={R} fill="none" strokeWidth="9" />
        <circle
          className="rs__ring-fill"
          cx="75" cy="75" r={R}
          fill="none"
          strokeWidth="9"
          strokeDasharray={C}
          strokeDashoffset={C - (C * value) / 100}
        />
      </svg>
      <div className="rs__ring-num">
        <span className="rs__ring-pct">{value}%</span>
        <span className="rs__ring-label">Match</span>
      </div>
    </div>
  );
}

export default function Result() {
  const { advance } = useJourney();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [savingNote, setSavingNote] = useState('');

  useEffect(() => {
    advance('result');
    let alive = true;
    quizService
      .latestResult()
      .then((r) => alive && setResult(r))
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [advance]);

  const save = async () => {
    try {
      const res = await careerService.save(top.career._id);
      setSaved(true);
      setSavingNote(res.message || 'Saved to your briefcase.');
    } catch (err) {
      setSavingNote(apiError(err));
    }
  };

  if (loading) {
    return <main className="rs"><div className="center-screen"><p className="t-low">Fetching your result…</p></div></main>;
  }

  if (error || !result?.matches?.length) {
    return (
      <main className="rs">
        <div className="center-screen wrap-narrow" style={{ textAlign: 'center' }}>
          <div>
            <h1 className="t-h2">No result yet</h1>
            <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
              {error || 'You have not taken the quiz yet.'}
            </p>
            <div style={{ marginTop: 'var(--sp-6)' }}><Button to="/quiz">Take the quiz</Button></div>
          </div>
        </div>
      </main>
    );
  }

  const top = result.matches[0];
  const career = top.career;
  const others = result.matches.slice(1, 5);
  const salary = formatSalary(career.salary);
  const demand = career.demand?.level ? DEMAND_LABEL[career.demand.level] : null;

  return (
    <main className="rs">
      <div className="wrap">
        <header className="rs__head">
          <p className="t-eyebrow">Career destination</p>
          <h1 className="t-h2 rs__title">Your career match</h1>
        </header>

        {/* The result, styled as a passport destination page */}
        <article className="rs__card">
          <div className="rs__stamp" role="img" aria-label={`Destination stamp: ${career.field?.name}`}>
            <span>
              <span className="rs__stamp-a">DESTINATION</span>
              <span className="rs__stamp-b">{(career.field?.name || '').toUpperCase()}</span>
              <span className="rs__stamp-a">PATHSEEKER</span>
            </span>
          </div>

          <div className="rs__top">
            <div>
              <p className="rs__card-eyebrow">Career destination</p>
              <h2 className="rs__career">{career.title}</h2>
              <p className="rs__field">{career.field?.name} · {career.summary}</p>
            </div>
            <MatchRing score={top.score} animate />
          </div>

          <section className="rs__section">
            <h3 className="rs__section-h">Why this fits you</h3>
            <ul className="rs__reasons">
              {top.reasons.map((reason, i) => (
                <li className="rs__reason" key={i}>
                  <span className="rs__reason-mark" aria-hidden="true">—</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rs__section">
            <h3 className="rs__section-h">What the work actually is</h3>
            <p className="rs__body">{career.description}</p>
            {career.dayInLife && (
              <p className="rs__body" style={{ marginTop: 'var(--sp-4)', fontStyle: 'italic' }}>
                A day in it: {career.dayInLife}
              </p>
            )}
          </section>

          <section className="rs__section">
            <h3 className="rs__section-h">Skills that matter</h3>
            <div className="rs__chips">
              {career.skills?.map((s) => (
                <span key={s.name} className={`chip ${s.weight >= 5 ? 'chip--strong' : ''}`}>
                  {s.name}
                </span>
              ))}
            </div>
          </section>

          {career.learningAreas?.length > 0 && (
            <section className="rs__section">
              <h3 className="rs__section-h">What to learn first</h3>
              <div className="rs__chips">
                {career.learningAreas.map((a) => <span key={a} className="chip">{a}</span>)}
              </div>
            </section>
          )}

          <section className="rs__section">
            <h3 className="rs__section-h">Market</h3>
            <div className="rs__facts">
              <div className="fact">
                <span className="fact__k">Demand</span>
                {demand ? (
                  <>
                    <span className="fact__v">{demand}</span>
                    {career.demand?.note && <span className="fact__note">{career.demand.note}</span>}
                  </>
                ) : (
                  <span className="fact__v fact__v--none">Information not available.</span>
                )}
              </div>

              <div className="fact">
                <span className="fact__k">Salary</span>
                {salary ? (
                  <>
                    <span className="fact__v t-mono">{salary}</span>
                    {/* The figure is only as good as its source, and we say so. */}
                    {career.salary?.source && <span className="fact__note">{career.salary.source}</span>}
                  </>
                ) : (
                  <span className="fact__v fact__v--none">Information not available.</span>
                )}
              </div>

              <div className="fact">
                <span className="fact__k">Next step</span>
                <span className="fact__v">{career.roadmap?.[0]?.title || 'Learn'}</span>
                <span className="fact__note">{career.roadmap?.[0]?.detail}</span>
              </div>
            </div>
          </section>
        </article>

        {/* Runners-up — the result is a ranking, not a verdict */}
        {others.length > 0 && (
          <section className="rs__others">
            <p className="t-eyebrow" style={{ textAlign: 'center' }}>Also worth a look</p>
            <div className="rs__other-grid" style={{ marginTop: 'var(--sp-4)' }}>
              {others.map((m) => (
                <Link key={m.career._id} to={`/careers/${m.career.slug}`} className="rs__other">
                  <span className="rs__other-top">
                    <span className="rs__other-title">{m.career.title}</span>
                    <span className="rs__other-pct">{m.score}%</span>
                  </span>
                  <span className="rs__other-sum">{m.career.summary}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="rs__actions">
          <Button size="lg" to="/roadmap">See your roadmap</Button>
          <Button variant="secondary" onClick={save} disabled={saved}>
            {saved ? 'Saved ✓' : 'Save this career'}
          </Button>
          <Button variant="ghost" to={`/careers/${career.slug}`}>Full career profile</Button>
        </div>
        {savingNote && <p className="t-low" style={{ textAlign: 'center', marginTop: 'var(--sp-3)' }}>{savingNote}</p>}
      </div>
    </main>
  );
}
