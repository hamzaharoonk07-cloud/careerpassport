import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { FieldIcon } from '../components/brand/FieldIcon.jsx';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { formatSalary } from './Result.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/airport.css';
import '../styles/destination.css';

const DEMAND_LABEL = { low: 'Low', moderate: 'Moderate', high: 'High', 'very-high': 'Very high' };

/** The four tabs. Splitting the page is what stops it being a wall of text. */
const TABS = [
  { key: 'brief', label: 'Flight brief' },
  { key: 'skills', label: 'What you carry' },
  { key: 'route', label: 'Route' },
  { key: 'market', label: 'Conditions' },
];

/**
 * A career destination, presented as an arrivals card.
 *
 * The previous version put every section on one scroll — description, day in
 * the life, skills, learning areas, six roadmap stages and the market panel —
 * which ran to several screens. The same content is here, but only one panel
 * at a time, so the page opens on a summary a reader can take in at a glance.
 */
export default function CareerDetail() {
  const { id } = useParams();
  const { isAuthed } = useAuth();

  const [career, setCareer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('brief');
  const [saveState, setSaveState] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setTab('brief');
    careerService
      .get(id)
      .then((c) => alive && setCareer(c))
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  const save = async () => {
    try {
      const res = await careerService.save(career._id);
      setSaveState(res.message || 'Saved.');
    } catch (err) {
      setSaveState(apiError(err));
    }
  };

  if (loading) return <div className="page wrap"><p className="t-low">Landing…</p></div>;

  if (error || !career) {
    return (
      <div className="page wrap center-screen" style={{ textAlign: 'center' }}>
        <div>
          <h1 className="t-h2">No such destination</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>{error}</p>
          <div style={{ marginTop: 'var(--sp-6)' }}><Button to="/careers">Back to departures</Button></div>
        </div>
      </div>
    );
  }

  const salary = formatSalary(career.salary);
  const demand = career.demand?.level ? DEMAND_LABEL[career.demand.level] : null;
  const topSkills = [...(career.skills || [])].sort((a, b) => b.weight - a.weight);

  return (
    <div className="dst">
      {/* Arrival plate */}
      <header className="dst__hero">
        <SceneVideo src="/videos/arrival.mp4" poster="/images/arrival.jpg" loop />

        <div className="wrap dst__hero-inner">
          <Link to="/careers" className="t-eyebrow dst__back">← Departures</Link>

          <div className="dst__plate">
            <span className="dst__plate-icon" style={{ '--board-accent': career.field?.accent }}>
              <FieldIcon name={career.field?.icon || 'briefcase'} size={26} />
            </span>
            <div className="dst__plate-text">
              <p className="t-eyebrow">Now arriving · {career.field?.name}</p>
              <h1 className="dst__title">{career.title}</h1>
              <p className="dst__summary">{career.summary}</p>
            </div>
          </div>

          {/* Everything a reader needs in four numbers */}
          <dl className="dst__strip">
            <div>
              <dt>Demand</dt>
              <dd>{demand || <em>Not available</em>}</dd>
            </div>
            <div>
              <dt>Typical pay</dt>
              <dd className="t-mono">{salary || <em>Not available</em>}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd style={{ textTransform: 'capitalize' }}>{career.workStyle?.environment || '—'}</dd>
            </div>
            <div>
              <dt>First step</dt>
              <dd>{career.roadmap?.[0]?.title || 'Learn'}</dd>
            </div>
          </dl>

          <div className="dst__actions">
            {isAuthed && (
              <Button onClick={save} disabled={Boolean(saveState)}>
                {saveState ? 'Saved ✓' : 'Save to my briefcase'}
              </Button>
            )}
            <Button variant="secondary" to="/quiz">Check my match</Button>
            {!isAuthed && <Button variant="ghost" to="/register">Get a passport</Button>}
          </div>
          {saveState && <p className="t-low dst__savenote">{saveState}</p>}
        </div>
      </header>

      {/* Panels */}
      <div className="wrap dst__body">
        <div className="dst__tabs" role="tablist" aria-label="Career details">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`dst__tab ${tab === t.key ? 'dst__tab--on' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="dst__panel" role="tabpanel" key={tab}>
          {tab === 'brief' && (
            <>
              <p className="dst__body-text">{career.description}</p>
              {career.dayInLife && (
                <div className="dst__note">
                  <span className="dst__note-k">A day in it</span>
                  <p>{career.dayInLife}</p>
                </div>
              )}
            </>
          )}

          {tab === 'skills' && (
            <>
              <div className="dst__skills">
                {topSkills.map((s) => (
                  <div className="dst__skill" key={s.name}>
                    <span className="dst__skill-n">{s.name}</span>
                    <span className="dst__pips" aria-label={`Importance ${s.weight} of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`dst__pip ${n <= s.weight ? 'dst__pip--on' : ''}`} />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              {career.learningAreas?.length > 0 && (
                <div className="dst__note">
                  <span className="dst__note-k">Learn first</span>
                  <div className="dst__chips">
                    {career.learningAreas.map((a) => <span key={a} className="tag">{a}</span>)}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'route' && (
            <ol className="dst__route">
              {career.roadmap?.map((s) => (
                <li key={s.stage}>
                  <span className="dst__wp t-mono">WP{String(s.stage).padStart(2, '0')}</span>
                  <div>
                    <h3 className="dst__route-t">{s.title}</h3>
                    <p className="dst__route-d">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {tab === 'market' && (
            <>
              <dl className="dst__market">
                <div>
                  <dt>Demand</dt>
                  <dd>{demand || <em>Information not available.</em>}</dd>
                  {career.demand?.note && <p className="dst__market-note">{career.demand.note}</p>}
                </div>
                <div>
                  <dt>Salary</dt>
                  <dd className="t-mono">{salary || <em>Information not available.</em>}</dd>
                  {career.salary?.source && <p className="dst__market-note">{career.salary.source}</p>}
                </div>
                <div>
                  <dt>Pace</dt>
                  <dd style={{ textTransform: 'capitalize' }}>{career.workStyle?.pace}</dd>
                </div>
                <div>
                  <dt>Collaboration</dt>
                  <dd style={{ textTransform: 'capitalize' }}>{career.workStyle?.collaboration}</dd>
                </div>
              </dl>
              {!salary && !demand && (
                <p className="dst__market-note" style={{ marginTop: 'var(--sp-4)' }}>
                  We would rather show nothing than a number we cannot stand behind.
                </p>
              )}
            </>
          )}
        </div>

        {career.related?.length > 0 && (
          <section className="dst__related">
            <p className="t-eyebrow">Connecting flights</p>
            <div className="dst__related-grid">
              {career.related.map((r) => (
                <Link key={r._id} to={`/careers/${r.slug}`} className="dst__related-card">
                  <span className="dst__related-t">{r.title}</span>
                  <span className="dst__related-go" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
