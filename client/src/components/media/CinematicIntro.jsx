import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import { Logo } from '../brand/Logo.jsx';
import './CinematicIntro.css';

const VIDEO_SRC = '/videos/passport-intro.mp4';
const POSTER_SRC = '/images/passport-intro.jpg';

/** How long the CSS fallback runs before handing over, in ms. */
const FALLBACK_DURATION = 5200;

/**
 * The opening cinematic — the single AI-generated video in the whole product.
 *
 * It is treated as an enhancement, never a dependency. Four things can
 * happen and all four end in the same place:
 *
 *   1. The video loads          → it plays, skippable at any time
 *   2. The file is missing      → the CSS passport-opening sequence plays
 *   3. Reduced motion is on     → poster only, with a continue control
 *   4. Data saver / slow link   → poster only, with a tap-to-play control
 *
 * The app must never wait on a file that may not exist yet.
 */
export function CinematicIntro({ onComplete, soundOn = false, onToggleSound }) {
  const reduced = useReducedMotion();
  const videoRef = useRef(null);
  const doneRef = useRef(false);

  const [mode, setMode] = useState('probing'); // probing | video | fallback | poster
  const [fading, setFading] = useState(false);

  /** Runs exactly once no matter which path triggers it. */
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    setTimeout(() => onComplete?.(), 620);
  };

  // Decide which path to take before mounting a video element at all.
  useEffect(() => {
    if (reduced) { setMode('poster'); return undefined; }

    const conn = navigator.connection;
    const stingy = conn?.saveData || ['slow-2g', '2g', '3g'].includes(conn?.effectiveType);
    if (stingy) { setMode('poster'); return undefined; }

    // HEAD the file rather than letting a <video> fail noisily in the console.
    //
    // Checking res.ok alone is not enough: a dev server (and most static hosts
    // configured for a single-page app) answers a missing path with 200 and the
    // index.html body. Without the content-type check we would mount a <video>
    // pointed at a page of HTML and show a black screen. The type is the real signal.
    let alive = true;
    fetch(VIDEO_SRC, { method: 'HEAD' })
      .then((res) => {
        if (!alive) return;
        const type = res.headers.get('content-type') || '';
        setMode(res.ok && type.startsWith('video/') ? 'video' : 'fallback');
      })
      .catch(() => alive && setMode('fallback'));
    return () => { alive = false; };
  }, [reduced]);

  // The CSS sequence is time-based, so it needs its own timer.
  useEffect(() => {
    if (mode !== 'fallback') return undefined;
    const t = setTimeout(finish, FALLBACK_DURATION);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !soundOn;
  }, [soundOn, mode]);

  // Escape skips, the way it should in anything cinematic.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`intro ${fading ? 'intro--out' : ''}`} role="dialog" aria-label="Opening sequence">
      {mode === 'video' && (
        <video
          ref={videoRef}
          className="intro__video"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted={!soundOn}
          playsInline
          preload="metadata"
          disablePictureInPicture
          onEnded={finish}
          onError={() => setMode('fallback')}
        />
      )}

      {mode === 'fallback' && <CssPassportOpening />}

      {(mode === 'poster' || mode === 'probing') && (
        <div className="intro__poster">
          <div className="intro__poster-mark"><Logo size={72} /></div>
          {mode === 'poster' && (
            <>
              <p className="t-eyebrow">Career Passport</p>
              <h1 className="intro__poster-title">Career Passport</h1>
              <p className="intro__poster-note">
                {reduced
                  ? 'Motion is reduced on this device, so the opening sequence is skipped.'
                  : 'The opening sequence is skipped to save data on this connection.'}
              </p>
            </>
          )}
        </div>
      )}

      <div className="intro__controls">
        {mode === 'video' && (
          <button type="button" className="intro__ctrl" onClick={onToggleSound} aria-pressed={soundOn}>
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
        )}
        <button type="button" className="intro__ctrl intro__ctrl--skip" onClick={finish}>
          {mode === 'poster' ? 'Continue' : 'Skip intro'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

/**
 * The no-video path: a passport opening, built from four divs.
 *
 * This is not a placeholder. If the mp4 never arrives, this is a complete
 * and intentional opening — which is the point of building it this way.
 */
function CssPassportOpening() {
  return (
    <div className="cin" aria-hidden="true">
      <div className="cin__desk" />
      <div className="cin__pool" />
      <div className="cin__book">
        <div className="cin__cover">
          <div className="cin__foil">
            <Logo size={54} />
            <span className="cin__foil-title">Career Passport</span>
          </div>
        </div>
        <div className="cin__paper">
          <span className="cin__line cin__line--1" />
          <span className="cin__line cin__line--2" />
          <span className="cin__line cin__line--3" />
        </div>
      </div>
      <div className="cin__title">
        <p className="t-eyebrow">Career Passport</p>
        <h1 className="cin__title-main">Your future needs a document.</h1>
      </div>
    </div>
  );
}
