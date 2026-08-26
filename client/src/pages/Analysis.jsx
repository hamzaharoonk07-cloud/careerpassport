import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourney } from '../context/JourneyContext.jsx';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import '../styles/quiz.css';

/**
 * The analysis beat.
 *
 * Deliberately short — 2.4 seconds. The scoring already happened server-side
 * when the quiz was submitted; this is the pause that lets the result land,
 * not a fake progress bar pretending to compute something.
 */
const STEPS = [
  'Reading your interests…',
  'Weighing your strengths…',
  'Matching your working preferences…',
  'Ranking careers against your profile…',
];

const STEP_MS = 560;

export default function Analysis() {
  const navigate = useNavigate();
  const { advance } = useJourney();
  const reduced = useReducedMotion();
  const [done, setDone] = useState(reduced ? STEPS.length : 0);

  useEffect(() => {
    advance('analysed');

    if (reduced) {
      navigate('/airport', { replace: true });
      return undefined;
    }

    const timers = STEPS.map((_, i) => setTimeout(() => setDone(i + 1), (i + 1) * STEP_MS));
    const exit = setTimeout(() => navigate('/airport', { replace: true }), STEPS.length * STEP_MS + 420);
    return () => { timers.forEach(clearTimeout); clearTimeout(exit); };
  }, [navigate, advance, reduced]);

  return (
    <main className="an">
      <div>
        <div className="an__ring" aria-hidden="true" />
        <p className="t-eyebrow" style={{ marginTop: 'var(--sp-6)' }}>Please wait</p>
        <h1 className="t-h2 an__title">Analysing your career path</h1>

        <ol className="an__steps" aria-live="polite">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className={`an__step ${i < done ? 'an__step--done' : ''}`}
              style={{ animationDelay: `${i * 160}ms` }}
            >
              <span className="an__tick" aria-hidden="true">{i < done ? '✓' : ''}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
