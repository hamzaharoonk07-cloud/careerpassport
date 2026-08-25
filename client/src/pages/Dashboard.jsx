import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { quizService } from '../services/quiz.service.js';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { formatSalary } from './Result.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/dashboard.css';

const AXIS_NAME = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
};

/**
 * The dashboard the user returns to.
 *
 * Everything on it is real: the match comes from their stored QuizResult,
 * the roadmap from the Career document, saved careers from the database.
 * Empty states say what is missing and link to the thing that fills them.
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.allSettled([quizService.latestResult(), careerService.listSaved()]).then(
      ([res, sav]) => {
        // A missing result is an empty state, not an error — a new user has none.
        if (res.status === 'fulfilled') setResult(res.value);
        if (sav.status === 'fulfilled') setSaved(sav.value);
        else setError(apiError(sav.reason));
        setLoading(false);
      }
    );
  };

  useEffect(load, []);

  const remove = async (careerId) => {
    await careerService.unsave(careerId);
    setSaved((prev) => prev.filter((s) => s.career._id !== careerId));
  };

  const top = result?.matches?.[0];
  const firstName = user?.name?.split(' ')[0] || 'traveller';

  return (
    <div className="page wrap dash">
      <header className="page__head">
        <div>
          <p className="t-eyebrow">Passport {user?.passportNumber}</p>
          <h1 className="t-h2 page__title">Welcome back, {firstName}.</h1>
        </div>
        {!top && <Button to="/airport">Start the journey</Button>}
      </header>

      {loading && <p className="t-low" style={{ marginTop: 'var(--sp-6)' }}>Loading your passport…</p>}

      {!loading && (
        <div className="db__grid">
          {/* ── Career match ─────────────────────────────── */}
          <section className="panel db__wide">
            <h2 className="panel__h">Career match</h2>
            {top ? (
              <div className="db__match">
                <span className="db__match-pct">{top.score}%</span>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className="db__match-title">{top.career.title}</div>
                  <div className="db__match-field">
                    {top.career.field?.name} · taken {new Date(result.takenAt).toLocaleDateString('en-GB')}
                  </div>
                  <p className="t-mid" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
                    {top.reasons[0]}
                  </p>
                </div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <Button size="sm" to="/result">Full result</Button>
                  <Button size="sm" variant="ghost" to="/quiz">Retake</Button>
                </div>
              </div>
            ) : (
              <div className="db__empty">
                <p>You have not taken the quiz yet, so there is nothing to match against.</p>
                <Button to="/airport">Take the journey</Button>
              </div>
            )}
          </section>

          {/* ── Trait profile ────────────────────────────── */}
          {result && (
            <section className="panel">
              <h2 className="panel__h">Your trait profile</h2>
              <div className="axes">
                {Object.entries(result.riasecVector || {}).map(([k, v]) => (
                  <div className="axis" key={k}>
                    <span className="axis__k">{AXIS_NAME[k]}</span>
                    <span className="axis__track">
                      <span className="axis__fill" style={{ width: `${(v / 10) * 100}%` }} />
                    </span>
                    <span className="axis__v">{Number(v).toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <p className="t-low" style={{ fontSize: '0.76rem', marginTop: 'var(--sp-4)', lineHeight: 1.6 }}>
                Holland codes, scored 0–10 from your answers. Your two strongest —{' '}
                {(result.dominantAxes || []).map((a) => AXIS_NAME[a]).join(' and ')} — drive 60% of the match.
              </p>
            </section>
          )}

          {/* ── Roadmap ──────────────────────────────────── */}
          {top?.career?.roadmap?.length > 0 && (
            <section className="panel">
              <h2 className="panel__h">Your roadmap</h2>
              <div className="db__stages">
                {top.career.roadmap.slice(0, 3).map((s) => (
                  <div className="db__stage" key={s.stage}>
                    <span className="db__stage-n">{s.stage}</span>
                    <div>
                      <div className="db__stage-t">{s.title}</div>
                      <div className="db__stage-d">{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <Button size="sm" variant="ghost" to="/roadmap">All six stages →</Button>
              </div>
            </section>
          )}

          {/* ── Saved careers ────────────────────────────── */}
          <section className="panel db__wide">
            <h2 className="panel__h">Saved careers ({saved.length})</h2>
            {error && <p className="t-low">{error}</p>}
            {saved.length === 0 ? (
              <div className="db__empty">
                <p>Nothing saved yet. Anything you save from the career bank lands here.</p>
                <Button variant="secondary" to="/careers">Browse careers</Button>
              </div>
            ) : (
              <div className="bank__grid" style={{ marginTop: 0 }}>
                {saved.map((s) => (
                  <div className="ccard" key={s._id}>
                    <div className="ccard__top">
                      <span className="ccard__field">{s.career.field?.name}</span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ padding: 0, minHeight: 'auto' }}
                        onClick={() => remove(s.career._id)}
                        aria-label={`Remove ${s.career.title}`}
                      >
                        Remove
                      </button>
                    </div>
                    <Link to={`/careers/${s.career.slug}`} className="ccard__title">{s.career.title}</Link>
                    <p className="ccard__sum">{s.career.summary}</p>
                    <div className="ccard__foot">
                      <span className={`tag ${s.career.hasSalaryData ? 'tag--gold' : ''}`}>
                        {formatSalary(s.career.salary) || 'Salary not available'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Profile ──────────────────────────────────── */}
          <section className="panel db__wide">
            <h2 className="panel__h">Profile</h2>
            <div className="db__profile">
              <div className="db__row"><span className="db__row-k">Name</span><span className="db__row-v">{user?.name}</span></div>
              <div className="db__row"><span className="db__row-k">Email</span><span className="db__row-v t-mono">{user?.email}</span></div>
              <div className="db__row"><span className="db__row-k">Passport</span><span className="db__row-v t-mono">{user?.passportNumber}</span></div>
              <div className="db__row"><span className="db__row-k">Password</span><span className="db__row-v t-mono">••••••••</span></div>
              <div className="db__row" style={{ borderBottom: 'none' }}>
                <span className="db__row-k">Member since</span>
                <span className="db__row-v">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '—'}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
