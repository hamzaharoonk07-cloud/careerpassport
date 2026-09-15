import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Passport } from '../components/brand/Passport.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { Button } from '../components/primitives/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { quizService } from '../services/quiz.service.js';
import { careerService } from '../services/career.service.js';
import { TabBar } from '../components/layout/TabBar.jsx';
import './PassportPage.css';

/**
 * The traveller's passport, and the moment it becomes theirs.
 *
 * Sequence, driven by CSS with React holding the state:
 *   0.5s  the cover swings open onto the spread
 *   1.2s  the holder's name is written onto the data page
 *   2.8s  the VERIFIED stamp lands
 *   3.6s  the way forward appears
 *
 * Skippable, and reduced motion shows the finished passport straight away.
 * The spread reads the holder's latest result and declared field, so a
 * returning traveller sees their traits, destination and stamps.
 */
export default function PassportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { advance, resumeRoute, stage } = useJourney();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(reduced);
  const [typing, setTyping] = useState(reduced);
  const [stamped, setStamped] = useState(reduced);
  const [ready, setReady] = useState(reduced);
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState(null);
  const [field, setField] = useState(null);

  useEffect(() => {
    let alive = true;
    quizService.latestResult().then((r) => alive && setResult(r)).catch(() => {});
    careerService.listFields()
      .then((fs) => alive && setField(fs.find((f) => String(f._id) === String(user?.selectedField)) || null))
      .catch(() => {});
    return () => { alive = false; };
  }, [user?.selectedField]);

  useEffect(() => {
    if (reduced) { advance('stamped'); return undefined; }
    const timers = [
      setTimeout(() => setOpen(true), 500),
      setTimeout(() => setTyping(true), 1200),
      setTimeout(() => setStamped(true), 2800),
      setTimeout(() => { setReady(true); advance('stamped'); }, 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced, advance]);

  const skip = () => {
    setOpen(true);
    setTyping(true);
    setStamped(true);
    setReady(true);
    advance('stamped');
  };

  // A new traveller goes on to choose a field; one further along resumes.
  const next = stage === 'registered' || stage === 'stamped' ? '/interests' : resumeRoute;
  const nextLabel = next === '/interests' ? 'Choose your field' : 'Continue your journey';

  const go = () => {
    if (reduced) { navigate(next); return; }
    setClosing(true);
    setTimeout(() => navigate(next), 700);
  };

  return (
    <main className="ppage">
      <SceneVideo src="/videos/stamp.mp4" poster="/images/stamp.jpg" loop>
        <div className="ppage__glow" aria-hidden="true" />
      </SceneVideo>

      <div className="wrap ppage__inner">
        <header className="ppage__head">
          <div>
            <p className={`ppage__status ${stamped ? 'is-verified' : ''}`}>
              {stamped ? 'Verified' : 'Issuing'}
              <span>{user?.passportNumber}</span>
            </p>
            <h1 className="ppage__title">
              {stamped ? `${user?.name?.split(' ')[0] || 'Your'}'s passport` : 'Issuing your passport…'}
            </h1>
          </div>
          <div className="ppage__actions">
            {ready ? (
              <>
                <Button variant="ghost" to="/account">Edit details</Button>
                <Button size="lg" onClick={go}>{nextLabel}</Button>
              </>
            ) : (
              <button type="button" className="ppage__skip" onClick={skip}>Skip <span aria-hidden="true">→</span></button>
            )}
          </div>
        </header>

        <Passport
          user={user}
          result={result}
          field={field}
          open={open}
          stamped={stamped}
          closing={closing}
          typing={typing}
        />
      </div>
      <TabBar />
    </main>
  );
}
