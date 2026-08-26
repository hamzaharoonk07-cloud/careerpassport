import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { ScrollFilm } from '../components/media/ScrollFilm.jsx';
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

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** One board on the dashboard. */
function Board({ title, note, wide = false, children }) {
  return (
    <section className={`dash__board ${wide ? 'dash__wide' : ''}`}>
      <div className="dash__board-head">
        <h2 className="dash__board-title">{title}</h2>
        {note && <span className="dash__board-note">{note}</span>}
      </div>
      <div className="dash__board-body">{children}</div>
    </section>
  );
}

/**
 * The dashboard the user returns to — presented as their flight status.
 *
 * Everything on it is real: the match comes from their stored QuizResult,
 * the roadmap from the Career document, saved careers from the database.
 * Empty states say what is missing and link to the thing that fills them.
 * The status word is derived from what exists, never invented — a traveller
 * with no result reads "not checked in", not a fabricated gate.
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
      {/* Fixed so the plate stays put while a long dashboard scrolls past it.
          cabin.mp4 rather than terminal.mp4: the terminal clip already plays
          on two other pages, and the cabin reads correctly here anyway — you
          are in your seat going back over the trip. SceneVideo falls back to
          the poster on reduced motion or save-data. */}
      <div className="dash__bg" aria-hidden="true">
        <SceneVideo src="/videos/cabin.mp4" poster="/images/cabin.jpg" loop />
      </div>

      {/* ── Boarding-pass strip ──────────────────────────── */}
      <header className="dash__strip">
        <div className="dash__stub">
          <span className="dash__stub-k">Passport</span>
          <span className="dash__stub-v">{user?.passportNumber || '—'}</span>
          <span className="dash__stub-k" style={{ marginTop: 'var(--sp-2)' }}>Class</span>
          <span className="dash__badge">{user?.accountType || 'student'}</span>
          <span className="dash__stub-k" style={{ marginTop: 'var(--sp-2)' }}>Status</span>
          <span className="dash__badge">{top ? 'Arrived' : 'Not checked in'}</span>
        </div>
        <div className="dash__strip-main">
          <div>
            <div className="dash__greet">Welcome back, {firstName}.</div>
            <p className="dash__sub">
              {top
                ? `Your route is filed. Last flown ${fmtDate(result.takenAt)}.`
                : 'No flight on record yet. The terminal is waiting.'}
            </p>
          </div>
          <div className="dash__strip-actions">
            {top
              ? <Button to="/result">Full result</Button>
              : <Button to="/airport">Start the journey</Button>}
            <Button variant="secondary" to="/careers">Departures board</Button>
          </div>
        </div>
      </header>

      {loading && <p className="t-low" style={{ marginTop: 'var(--sp-6)' }}>Loading your passport…</p>}

      {!loading && (
        <div className="dash__grid">
          {/* ── Flight status: the match ─────────────────── */}
          <Board title="Flight status" note={top ? 'Confirmed' : 'Awaiting departure'} wide>
            {top ? (
              <div className="dash__status">
                <span className="dash__pct">{top.score}%</span>
                <div>
                  <div className="dash__dest">{top.career.title}</div>
                  <div className="dash__meta">
                    {top.career.field?.name} · flown {fmtDate(result.takenAt)}
                  </div>
                  <p className="dash__why">{top.reasons[0]}</p>
                </div>
                <div className="dash__status-actions">
                  <Button size="sm" to="/result">Full result</Button>
                  <Button size="sm" variant="ghost" to="/quiz">Retake</Button>
                </div>
              </div>
            ) : (
              <div className="dash__empty">
                <p>You have not taken the quiz yet, so there is nothing to match against.</p>
                <Button to="/airport">Take the journey</Button>
              </div>
            )}
          </Board>

          {/* ── The counsel, in full ──────────────────────
              It lived only on /result, which meant a returning traveller
              saw a percentage and no reasoning — the part that actually
              helps them decide was one click away and easy to miss. */}
          {result?.counsel && (
            <Board
              title="What this means"
              note={
                result.counsel.confidence === 'clear' ? 'Clear result'
                  : result.counsel.confidence === 'leaning' ? 'A lean'
                  : 'Too close to call'
              }
              wide
            >
              <h3 className="dash__counsel-h">{result.counsel.headline}</h3>
              <p className="dash__counsel-p">{result.counsel.verdict}</p>

              {result.counsel.difference && (
                <div className="dash__counsel-block">
                  <span className="dash__rec-k">What you are choosing between</span>
                  <p>{result.counsel.difference.text}</p>
                </div>
              )}

              {result.counsel.firstStep && (
                <div className="dash__counsel-block">
                  <span className="dash__rec-k">Where to start</span>
                  <p><strong>{result.counsel.firstStep.title}.</strong> {result.counsel.firstStep.detail}</p>
                </div>
              )}

              {result.counsel.wouldChangeThis && (
                <div className="dash__counsel-block">
                  <span className="dash__rec-k">What would change this</span>
                  <p>{result.counsel.wouldChangeThis}</p>
                </div>
              )}

              {result.counsel.honestly && (
                <p className="dash__counsel-honest">{result.counsel.honestly}</p>
              )}
            </Board>
          )}

          {/* ── Instruments: trait profile ───────────────── */}
          {result && (
            <Board title="Instruments" note="Holland codes">
              <div className="dash__gauges">
                {Object.entries(result.riasecVector || {}).map(([k, v]) => (
                  <div className="dash__gauge" key={k}>
                    <span className="dash__gauge-k">{AXIS_NAME[k]}</span>
                    <span className="dash__gauge-track">
                      <span className="dash__gauge-fill" style={{ width: `${(v / 10) * 100}%` }} />
                    </span>
                    <span className="dash__gauge-v">{Number(v).toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <p className="t-low" style={{ fontSize: '0.76rem', marginTop: 'var(--sp-4)', lineHeight: 1.6 }}>
                Scored 0–10 from your answers. Your two strongest —{' '}
                {(result.dominantAxes || []).map((a) => AXIS_NAME[a]).join(' and ')} — drive 60% of the match.
              </p>
            </Board>
          )}

          {/* ── Route: roadmap legs ──────────────────────── */}
          {top?.career?.roadmap?.length > 0 && (
            <Board title="Route" note={`${top.career.roadmap.length} legs`}>
              <div className="dash__legs">
                {top.career.roadmap.slice(0, 3).map((s) => (
                  <div className="dash__leg" key={s.stage}>
                    <span className="dash__leg-n">{s.stage}</span>
                    <div>
                      <div className="dash__leg-t">{s.title}</div>
                      <div className="dash__leg-d">{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <Button size="sm" variant="ghost" to="/roadmap">All six stages →</Button>
              </div>
            </Board>
          )}

          {/* ── Watchlist: saved careers ─────────────────── */}
          <Board title="Watchlist" note={`${saved.length} saved`} wide>
            {error && <p className="t-low">{error}</p>}
            {saved.length === 0 ? (
              <div className="dash__empty">
                <p>Nothing saved yet. Anything you save from the departures board lands here.</p>
                <Button variant="secondary" to="/careers">See all destinations</Button>
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
          </Board>

          {/* ── Passenger record ─────────────────────────── */}
          <Board title="Passenger record" wide>
            <div className="dash__rec">
              <div className="dash__rec-row"><span className="dash__rec-k">Name</span><span className="dash__rec-v">{user?.name}</span></div>
              <div className="dash__rec-row"><span className="dash__rec-k">Email</span><span className="dash__rec-v t-mono">{user?.email}</span></div>
              <div className="dash__rec-row"><span className="dash__rec-k">Passport</span><span className="dash__rec-v t-mono">{user?.passportNumber}</span></div>
              <div className="dash__rec-row"><span className="dash__rec-k">Password</span><span className="dash__rec-v t-mono">••••••••</span></div>
              <div className="dash__rec-row">
                <span className="dash__rec-k">Member since</span>
                <span className="dash__rec-v">{fmtDate(user?.createdAt)}</span>
              </div>
            </div>
          </Board>
        </div>
      )}

      {/* The same closing film the result ends on. A returning traveller
          should reach the same place, not a page that just stops. */}
      {top && (
        <ScrollFilm
          src="/videos/briefcase.mp4"
          portraitSrc="/videos/briefcase-portrait.mp4"
          poster="/images/briefcase.jpg"
          height="300vh"
          className="dash__film"
          chapters={[
            {
              at: 0,
              eyebrow: 'Your case',
              title: 'Everything you have decided so far',
              body: 'Your destination, the reasoning behind it, and the route in.',
            },
            {
              at: 0.45,
              eyebrow: 'Opening',
              title: top.career.title,
              body: `${top.score}% match · ${top.career.field?.name}.`,
            },
            {
              at: 0.8,
              variant: 'close',
              eyebrow: 'Take it with you',
              title: 'Your future is worth carrying.',
              body: 'Saved careers, your notes and the six-stage flight plan.',
            },
          ]}
        />
      )}
    </div>
  );
}
