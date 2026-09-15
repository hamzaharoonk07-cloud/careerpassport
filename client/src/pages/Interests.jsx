import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { FieldIcon } from '../components/brand/FieldIcon.jsx';
import { FlightLoader, useLanding } from '../components/brand/FlightLoader.jsx';
import { TabBar } from '../components/layout/TabBar.jsx';
import { careerService } from '../services/career.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import '../styles/interests.css';

/**
 * Customs: the field declaration.
 *
 * Straight after the passport. A traveller who already knows where they want
 * to go picks a field and the terminal opens on that field's gates. One who
 * does not gets seven questions instead of being handed thirty-eight job
 * titles and asked to guess.
 */
export default function Interests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chooseField, advance } = useJourney();

  const [fields, setFields] = useState([]);
  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    advance('stamped');
    let alive = true;
    Promise.all([careerService.listFields(), careerService.list({ limit: 60 })])
      .then(([f, c]) => {
        if (!alive) return;
        setFields(f);
        setCareers(c.careers || []);
        // Coming back to change a field: start from the one already declared.
        const current = f.find((x) => String(x._id) === String(user?.selectedField));
        if (current) setPicked(current.slug);
      })
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // user.selectedField is read once to preselect; re-running on change would
    // overwrite the traveller's click with the value it just saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance]);

  const byField = useMemo(() => {
    const map = new Map();
    for (const c of careers) {
      const slug = c.field?.slug;
      if (!slug) continue;
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug).push(c);
    }
    return map;
  }, [careers]);

  const pickedField = fields.find((f) => f.slug === picked) || null;

  const proceed = async () => {
    if (!picked) return;
    setSaving(true);
    setError('');
    try {
      await chooseField(picked);
      navigate('/airport');
    } catch (err) {
      setError(apiError(err));
      setSaving(false);
    }
  };

  const { held, landing } = useLanding(loading);
  if (held) {
    return (
      <main className="ints">
        <div className="center-screen"><FlightLoader label="Opening customs" {...landing} /></div>
      </main>
    );
  }

  return (
    <main className="ints">
      <SceneVideo src="/videos/gate.mp4" poster="/images/gate.jpg" loop />

      <div className="wrap ints__inner">
        <header className="ints__head">
          <ol className="ints__steps" aria-label="Journey progress">
            <li className="is-done">Passport</li>
            <li className="is-now" aria-current="step">Field</li>
            <li>Gate</li>
            <li>Report</li>
          </ol>
          <p className="t-eyebrow">Customs declaration · {user?.passportNumber}</p>
          <h1 className="ints__title">Which field are you interested in?</h1>
          <p className="t-lead ints__lead">
            Pick the one that pulls at you. The terminal will open on its gates, and you
            choose the exact career there. Not sure? Seven questions will point you.
          </p>
        </header>

        <form
          className="ints__form"
          onSubmit={(e) => { e.preventDefault(); proceed(); }}
        >
          <fieldset className="ints__grid">
            <legend className="sr-only">Career field</legend>
            {fields.map((f, i) => {
              const list = byField.get(f.slug) || [];
              const on = picked === f.slug;
              return (
                <label
                  key={f.slug}
                  className={`fcard ${on ? 'fcard--on' : ''}`}
                  style={{ '--accent': f.accent, '--i': i }}
                >
                  <input
                    type="radio"
                    name="field"
                    value={f.slug}
                    checked={on}
                    onChange={() => setPicked(f.slug)}
                    className="sr-only"
                  />
                  <span className="fcard__top">
                    <span className="fcard__icon"><FieldIcon name={f.icon} size={22} /></span>
                    <span className="fcard__check" aria-hidden="true">{on ? '✓' : ''}</span>
                  </span>
                  <span className="fcard__name">{f.name}</span>
                  <span className="fcard__tag">{f.tagline}</span>
                  <span className="fcard__roles">
                    {list.slice(0, 3).map((c) => (
                      <span key={c.slug} className="fcard__role">{c.title}</span>
                    ))}
                    {list.length > 3 && <span className="fcard__more">+{list.length - 3} more</span>}
                  </span>
                </label>
              );
            })}

            <button
              type="button"
              className="fcard fcard--unsure"
              style={{ '--i': fields.length }}
              onClick={() => navigate('/quiz?mode=quick')}
            >
              <span className="fcard__top">
                <span className="fcard__icon fcard__icon--q" aria-hidden="true">?</span>
                <span className="fcard__badge">7 questions · 2 min</span>
              </span>
              <span className="fcard__name">I'm not sure yet</span>
              <span className="fcard__tag">
                Answer seven short questions about what you enjoy and we'll recommend a field.
              </span>
              <span className="fcard__cta">Help me decide <span aria-hidden="true">→</span></span>
            </button>
          </fieldset>

          {error && <p className="auth__alert" role="alert">{error}</p>}

          <div className={`ints__bar ${pickedField ? 'is-ready' : ''}`}>
            <p className="ints__bar-text" aria-live="polite">
              {pickedField ? (
                <>Heading to <strong>{pickedField.name}</strong> · {(byField.get(pickedField.slug) || []).length} gates</>
              ) : (
                'Select a field to continue'
              )}
            </p>
            <Button type="submit" size="lg" disabled={!pickedField} loading={saving}>
              Continue to the gates <span aria-hidden="true">→</span>
            </Button>
          </div>
        </form>
      </div>
      <TabBar />
    </main>
  );
}
