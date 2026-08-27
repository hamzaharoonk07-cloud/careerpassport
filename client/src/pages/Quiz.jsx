import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { quizService } from '../services/quiz.service.js';
import { apiError } from '../services/api.js';
import { useJourney } from '../context/JourneyContext.jsx';
import { FlightLoader, useLanding } from '../components/brand/FlightLoader.jsx';
import { TabBar } from '../components/layout/TabBar.jsx';
import '../styles/quiz.css';

const DRAFT_KEY = 'pathseeker.quiz.draft';

const DIMENSION_LABEL = {
  interests: 'Interests',
  strengths: 'Strengths',
  'problem-solving': 'Problem solving',
  creativity: 'Creativity',
  communication: 'Communication',
  'technical-interest': 'Technical interest',
  'business-interest': 'Business interest',
  'work-environment': 'Work environment',
  'learning-preference': 'Learning preference',
  values: 'Values',
};

/**
 * The career quiz.
 *
 * Ten questions, one at a time, no page reload. Answers are written to
 * localStorage on every selection so a dropped connection or a closed tab
 * never costs the user their progress — the brief calls this out and it is
 * the single most annoying thing to get wrong in a quiz.
 */
export default function Quiz() {
  const navigate = useNavigate();
  const { advance } = useJourney();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});      // questionId -> optionId
  const [index, setIndex] = useState(0);
  const [anim, setAnim] = useState('in-right');
  // True while a question is sliding out and the next is sliding in. The old
  // card is still in the DOM during that window, so without this a fast click
  // lands on the question the user has already left.
  const [moving, setMoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    advance('quiz');
    let alive = true;

    quizService
      .getQuestions()
      .then((qs) => {
        if (!alive) return;
        setQuestions(qs);

        // Restore a draft, but only if it matches this exact question set —
        // a stale draft from an older question bank would score nonsense.
        try {
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
          const ids = new Set(qs.map((q) => q.id));
          if (draft?.answers && Object.keys(draft.answers).every((id) => ids.has(id))) {
            const count = Object.keys(draft.answers).length;
            if (count > 0 && count < qs.length) {
              setAnswers(draft.answers);
              setIndex(Math.min(draft.index ?? count, qs.length - 1));
              setRestored(true);
            }
          }
        } catch {
          // A corrupt draft is not worth telling the user about — start clean.
        }
      })
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [advance]);

  // Persist after every change.
  useEffect(() => {
    if (!Object.keys(answers).length) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, index }));
    } catch { /* storage unavailable — the quiz still works */ }
  }, [answers, index]);

  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;

  const go = (nextIndex, direction) => {
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    setMoving(true);
    setAnim(direction === 'forward' ? 'out-left' : 'out-right');
    setTimeout(() => {
      setIndex(nextIndex);
      setAnim(direction === 'forward' ? 'in-right' : 'in-left');
      setMoving(false);
    }, 200);
  };

  const choose = (optionId) => {
    if (moving) return;
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
    // Auto-advance, but only forward and only if there is somewhere to go.
    if (index < questions.length - 1) setTimeout(() => go(index + 1, 'forward'), 320);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] }));
      const result = await quizService.submit(payload);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* fine */ }
      advance('analysed');
      navigate('/analysis', { replace: true, state: { resultId: result._id } });
    } catch (err) {
      setError(apiError(err));
      setSubmitting(false);
    }
  };

  const firstUnanswered = useMemo(
    () => questions.findIndex((q) => !answers[q.id]),
    [questions, answers]
  );

  // Hold the loader until its climb resolves, then show the page.
  const { held, landing } = useLanding(loading);
  if (held) {
    return (
      <main className="qz">
        <div className="wrap-narrow center-screen"><FlightLoader label="Preparing your questions" {...landing} /></div>
      </main>
    );
  }

  if (error && !questions.length) {
    return (
      <main className="qz">
        <div className="wrap-narrow center-screen" style={{ textAlign: 'center' }}>
          <div>
            <p className="auth__alert" role="alert">{error}</p>
            <div style={{ marginTop: 'var(--sp-5)' }}>
              <Button onClick={() => window.location.reload()}>Try again</Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="qz">
      <div className="wrap-narrow">
        <div className="qz__bar-wrap">
          <div className="qz__meta">
            <span>Question <strong>{String(index + 1).padStart(2, '0')}</strong> / {String(questions.length).padStart(2, '0')}</span>
            <span>{answeredCount} answered</span>
          </div>
          <div className="qz__bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="qz__bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {restored && (
          <div className="qz__resume">
            <span>We kept your place — you had answered {answeredCount} of {questions.length}.</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => { setAnswers({}); setIndex(0); setRestored(false); try { localStorage.removeItem(DRAFT_KEY); } catch { /* fine */ } }}
            >
              Start over
            </button>
          </div>
        )}

        <div className="qz__stage">
          {question && (
            <div className={`qz__q qz__q--${anim} ${moving ? 'qz__q--locked' : ''}`} key={question.id}>
              <div>
                <p className="qz__dimension">{DIMENSION_LABEL[question.dimension] || question.dimension}</p>
                <h1 className="qz__prompt" style={{ marginTop: 'var(--sp-3)' }}>{question.prompt}</h1>
                {question.helper && <p className="qz__helper" style={{ marginTop: 'var(--sp-3)' }}>{question.helper}</p>}
              </div>

              <div className="qz__options" role="radiogroup" aria-label={question.prompt}>
                {question.options.map((opt) => {
                  const on = answers[question.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`opt ${on ? 'opt--on' : ''}`}
                      onClick={() => choose(opt.id)}
                      disabled={moving}
                    >
                      <span className="opt__key" aria-hidden="true">{on ? '✓' : opt.key}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && <div className="auth__alert" style={{ marginTop: 'var(--sp-4)' }} role="alert">{error}</div>}

        <nav className="qz__nav">
          <Button
            variant="ghost"
            onClick={() => go(index - 1, 'back')}
            disabled={index === 0 || moving}
          >
            ← Back
          </Button>

          <div className="qz__dots" aria-hidden="true">
            {questions.map((q, i) => (
              <span
                key={q.id}
                className={`qz__dot ${answers[q.id] ? 'qz__dot--done' : ''} ${i === index ? 'qz__dot--now' : ''}`}
              />
            ))}
          </div>

          {allAnswered ? (
            <Button onClick={submit} loading={submitting}>Submit</Button>
          ) : index < questions.length - 1 ? (
            <Button
              variant="secondary"
              onClick={() => go(index + 1, 'forward')}
              disabled={!answers[question?.id] || moving}
            >
              Next →
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => go(firstUnanswered, 'back')}
              disabled={firstUnanswered === -1}
            >
              Go to unanswered
            </Button>
          )}
        </nav>
      </div>
      <TabBar />
    </main>
);
}
