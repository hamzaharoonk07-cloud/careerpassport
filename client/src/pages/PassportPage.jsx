import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Passport } from '../components/brand/Passport.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { Button } from '../components/primitives/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import './PassportPage.css';

/**
 * The moment the document becomes the user's.
 *
 * Sequence, driven entirely by CSS with React holding the state:
 *   0.4s  the cover swings open
 *   1.2s  the holder's name is written on, character by character
 *   3.0s  the PATHSEEKER VERIFIED stamp lands and the paper flinches
 *   4.2s  the way forward appears
 *
 * Every step is skippable, and reduced motion collapses the whole thing
 * to its finished state immediately.
 */
export default function PassportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { advance } = useJourney();
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(reduced);
  const [typing, setTyping] = useState(reduced);
  const [stamped, setStamped] = useState(reduced);
  const [ready, setReady] = useState(reduced);
  const [closing, setClosing] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (reduced) { advance('stamped'); return undefined; }

    const timers = [
      setTimeout(() => setOpen(true), 400),
      setTimeout(() => setTyping(true), 1200),
      setTimeout(() => setStamped(true), 3000),
      setTimeout(() => { setReady(true); advance('stamped'); }, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced, advance]);

  /** Skips straight to the stamped, finished state. */
  const skip = () => {
    setOpen(true);
    setTyping(true);
    setStamped(true);
    setReady(true);
    advance('stamped');
  };

  /** Closes the passport, then hands off to the station. */
  const toStation = () => {
    advance('station');
    if (reduced) { navigate('/airport'); return; }
    setClosing(true);
    setTimeout(() => navigate('/airport'), 900);
  };

  return (
    <main className="ppage">
      <SceneVideo src="/videos/stamp.mp4" poster="/images/stamp.jpg" loop>
        <div className="ppage__glow" aria-hidden="true" />
      </SceneVideo>

      <div className="wrap ppage__inner">
        <header className={`ppage__head ${stamped ? 'is-in' : ''}`}>
          <p className="t-eyebrow">Document issued</p>
          <h1 className="t-h2 ppage__title">
            {stamped ? 'Your passport is verified.' : 'Issuing your passport…'}
          </h1>
        </header>

        <Passport
          user={user}
          open={open}
          stamped={stamped}
          closing={closing}
          typing={typing}
          page={page}
          onPageChange={(p) => setPage(Math.max(0, Math.min(3, p)))}
        />

        <footer className="ppage__foot">
          {ready ? (
            <div className="ppage__actions anim-rise">
              <p className="t-mid ppage__note">
                Passport <strong>{user?.passportNumber}</strong> is now yours. The station is waiting.
              </p>
              <Button onClick={toStation} size="lg">Board your future</Button>
            </div>
          ) : (
            <button type="button" className="ppage__skip" onClick={skip}>
              Skip <span aria-hidden="true">→</span>
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}
