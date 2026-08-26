import { useEffect, useState } from 'react';
import { Button } from '../components/primitives/Button.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
import { quizService } from '../services/quiz.service.js';
import { apiError } from '../services/api.js';
import { useJourney } from '../context/JourneyContext.jsx';
import '../styles/quiz.css';
import '../styles/airport.css';
import { SceneVideo } from '../components/media/SceneVideo.jsx';

/**
 * The six-stage roadmap for the user's top career.
 *
 * Stages reveal sequentially on scroll via IntersectionObserver, and every
 * word of detail comes from the Career document in MongoDB — nothing here
 * is generated in the browser.
 */
export default function Roadmap() {
  const { advance } = useJourney();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    advance('roadmap');
    let alive = true;
    quizService
      .latestResult()
      .then((r) => alive && setResult(r))
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [advance]);

  if (loading) {
    return <main className="rm" style={{ position: 'relative', isolation: 'isolate' }}><div className="center-screen"><p className="t-low">Loading your roadmap…</p></div></main>;
  }

  if (error || !result?.matches?.length) {
    return (
      <main className="rm" style={{ position: 'relative', isolation: 'isolate' }}>
        <div className="center-screen wrap-narrow" style={{ textAlign: 'center' }}>
          <div>
            <h1 className="t-h2">No roadmap yet</h1>
            <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
              {error || 'Take the quiz and a roadmap is built from your top match.'}
            </p>
            <div style={{ marginTop: 'var(--sp-6)' }}><Button to="/quiz">Take the quiz</Button></div>
          </div>
        </div>
      </main>
    );
  }

  const top = result.matches[0];
  const stages = top.career.roadmap || [];

  return (
    <main className="rm" style={{ position: 'relative', isolation: 'isolate' }}>
      <SceneVideo src="/videos/cruise.mp4" poster="/images/cruise.jpg" loop />

      <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
        <header className="rm__head">
          <p className="t-eyebrow">Flight plan · {top.career.field?.name || 'Route'}</p>
          <h1 className="t-h2 rm__title">Your route to {top.career.title}</h1>
          <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
            Six waypoints between here and the destination. It is a flight plan, not a
            promise — but every leg is something you can start this week.
          </p>
        </header>

        <div className="fplan">
          {stages.map((stage, i) => (
            <Reveal key={stage.stage} className="fplan__leg" delay={i * 90}>
              <span className="fplan__marker" aria-hidden="true">
                <span className="fplan__dot" />
              </span>
              <div className="fplan__card">
                <div className="fplan__card-head">
                  <span className="fplan__wp t-mono">WP{String(stage.stage).padStart(2, '0')}</span>
                  <h2 className="stage__title">{stage.title}</h2>
                </div>
                <p className="stage__detail">{stage.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="rm__foot">
          <p className="t-mid" style={{ marginBottom: 'var(--sp-4)' }}>
            That is the flight plan. Start at stage one — the rest waits.
          </p>
        </div>
      </div>
    </main>
  );
}
