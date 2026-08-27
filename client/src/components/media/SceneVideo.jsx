import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import { useHiResVideo, hiResSrc } from '../../hooks/useHiResVideo.js';
import './SceneVideo.css';

/**
 * A cinematic scene backed by video, with the CSS scene as its fallback.
 *
 * The video is a *layer*, never a dependency. Whatever happens, `children`
 * (the hand-built CSS scene) is what renders underneath — so a missing file,
 * a slow connection, a codec the browser dislikes, or a reduced-motion
 * preference all degrade to something that still looks intentional rather
 * than to a black rectangle.
 *
 * Probing rather than trusting <video onError>: a dev server and most static
 * hosts answer a missing path with 200 and an HTML body, so `res.ok` alone
 * would mount a video element pointed at a page of markup. The content-type
 * is the only honest signal.
 */
export function SceneVideo({
  src,
  poster,
  children,
  loop = false,
  onEnded,
  overlay = true,
  className = '',
  fit = 'cover',
  hiRes = true,
}) {
  const reduced = useReducedMotion();
  const wantsHiRes = useHiResVideo() && hiRes;
  const videoRef = useRef(null);
  const [state, setState] = useState('probing'); // probing | playing | fallback

  useEffect(() => {
    if (reduced) { setState('fallback'); return undefined; }

    const conn = navigator.connection;
    if (conn?.saveData || ['slow-2g', '2g', '3g'].includes(conn?.effectiveType)) {
      setState('fallback');
      return undefined;
    }

    let alive = true;

    // One retry before giving up. The dev server answers 503 for a moment
    // while it restarts, and a production edge can drop a request just as
    // easily — without a retry a single blip pins the scene to its poster for
    // the whole page load, which reads as "the video is broken".
    const probe = (attempt = 0) => {
      fetch(src, { method: 'HEAD', cache: 'no-store' })
        .then((res) => {
          if (!alive) return;
          const type = res.headers.get('content-type') || '';
          if (res.ok && type.startsWith('video/')) { setState('playing'); return; }
          if (attempt === 0) { setTimeout(() => alive && probe(1), 600); return; }
          setState('fallback');
        })
        .catch(() => {
          if (!alive) return;
          if (attempt === 0) setTimeout(() => alive && probe(1), 600);
          else setState('fallback');
        });
    };

    probe();

    return () => { alive = false; };
  }, [src, reduced]);

  // A scene that has fallen back still has to hand control onward, or the
  // journey stops at a stage that was waiting for an `ended` event.
  useEffect(() => {
    if (state !== 'fallback' || !onEnded) return undefined;
    const t = setTimeout(onEnded, 400);
    return () => clearTimeout(t);
  }, [state, onEnded]);

  return (
    <div className={`sv ${className}`}>
      {/* The CSS scene. Always present, always the floor. */}
      <div className={`sv__fallback ${state === 'playing' ? 'sv__fallback--hidden' : ''}`}>
        {children}
      </div>

      {state === 'playing' && (
        <video
          ref={videoRef}
          key={wantsHiRes ? 'hi' : 'sd'}
          className="sv__video"
          style={{ objectFit: fit }}
          poster={poster}
          autoPlay
          muted
          playsInline
          loop={loop}
          preload="metadata"
          disablePictureInPicture
          onEnded={onEnded}
          onError={() => setState('fallback')}
        >
          {/* On a display with the pixels to show it, the 1440p cut goes first.
              It is H.264 only, so it sits above the WebM rather than beside it;
              if the file is not there the browser walks on to the next source
              by itself, which is what makes the tier safe to add clip by clip
              rather than all at once. */}
          {wantsHiRes && <source src={hiResSrc(src)} type="video/mp4" />}

          {/* WebM next: roughly 30% smaller on the same source, and every
              browser that understands it prefers it. The mp4 is the floor. */}
          <source src={src.replace(/\.mp4$/, '.webm')} type="video/webm" />
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/* Keeps foreground copy legible over any frame of any clip. */}
      {overlay && state === 'playing' && <div className="sv__scrim" aria-hidden="true" />}
    </div>
  );
}
