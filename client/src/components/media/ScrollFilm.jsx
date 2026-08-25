import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import { Reveal } from '../motion/Reveal.jsx';
import './ScrollFilm.css';

/**
 * The landing page, as one film the visitor scrubs by scrolling.
 *
 * The video never plays itself. Its `currentTime` is driven from how far the
 * section has moved through the viewport, so scrolling down flies the aircraft
 * forward and scrolling up flies it back. Chapter copy is pinned to timestamps
 * so the words and the picture stay in step, and the first and last chapters
 * carry the page's calls to action — the film runs from the top of the page
 * through to the passport.
 *
 * Three things this has to get right or it feels broken:
 *
 *   1. Seek inside requestAnimationFrame, never in the scroll handler.
 *      Setting currentTime on every scroll event fights the decoder and
 *      stutters; one seek per frame is what the decoder can actually serve.
 *
 *   2. Ease toward the target rather than jumping to it. A raw mapping makes
 *      every flick of the wheel a hard cut.
 *
 *   3. Degrade to a real page, not a stub. Touch and reduced-motion visitors
 *      cannot scrub — iOS will not seek a video reliably — and since this
 *      component *is* the landing page, showing them only the first chapter
 *      would leave the site with no content. They get every chapter stacked
 *      in normal flow over a still, which reads as an ordinary long page.
 */
export function ScrollFilm({
  src,
  mobileSrc,
  mobileSrcHq,
  poster,
  chapters = [],
  height = '600vh',
  className = '',
}) {
  const reduced = useReducedMotion();
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const raf = useRef(null);
  const target = useRef(0);
  const current = useRef(0);
  const lastScroll = useRef(0);

  const [ready, setReady] = useState(false);
  const [scrubbable, setScrubbable] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [thrifty, setThrifty] = useState(false);
  const [chapter, setChapter] = useState(0);

  // The loop below reads the chapter list every frame but must not restart
  // when it changes identity. Callers pass an array literal, so `chapters` is
  // a new object on every render — listing it as a dependency would cancel and
  // re-request the animation frame each time setChapter re-renders us, which
  // is enough seek-then-abort churn to stall the decoder.
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  // Phones scrub too now. Only reduced motion falls back to the stacked
  // page — a touch device driving the film with its thumb is the whole
  // point of the effect, not something to opt out of.
  useEffect(() => { setScrubbable(!reduced); }, [reduced]);

  // Does this connection want us to spend its bytes?
  useEffect(() => {
    const c = navigator.connection;
    if (!c) return undefined;
    const decide = () => setThrifty(
      Boolean(c.saveData) || ['slow-2g', '2g', '3g'].includes(c.effectiveType)
    );
    decide();
    c.addEventListener?.('change', decide);
    return () => c.removeEventListener?.('change', decide);
  }, []);

  // Narrow viewports get the lighter cut and a shorter scroll track.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // iOS will not honour a currentTime assignment on a video that has never
  // played — the seek is silently ignored and the film sits on frame one.
  // Playing and immediately pausing inside the first touch unlocks it. The
  // gesture requirement is why this cannot be done on mount.
  useEffect(() => {
    if (!scrubbable) return undefined;
    const prime = () => {
      const v = videoRef.current;
      if (!v) return;
      const p = v.play();
      if (p && p.then) p.then(() => v.pause()).catch(() => { /* blocked; scrub still tries */ });
      else v.pause();
    };
    window.addEventListener('touchstart', prime, { passive: true, once: true });
    return () => window.removeEventListener('touchstart', prime);
  }, [scrubbable]);

  // Track scroll progress through the section.
  useEffect(() => {
    if (!scrubbable) return undefined;

    // Geometry is cached rather than measured per scroll event.
    // getBoundingClientRect() forces the browser to flush pending layout
    // before it can answer, and doing that inside a scroll handler during
    // momentum scrolling on a phone is a stall on every event. The section
    // only changes size on resize, so measure it there and read the cheap
    // scrollY the rest of the time.
    let top = 0;
    let scrollable = 1;

    const measure = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      top = rect.top + window.scrollY;
      scrollable = Math.max(1, rect.height - window.innerHeight);
    };

    const onScroll = () => {
      target.current = Math.min(1, Math.max(0, (window.scrollY - top) / scrollable));
      lastScroll.current = performance.now();
    };

    // Named, so the same reference can be removed again.
    const onResize = () => { measure(); onScroll(); };

    measure();
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [scrubbable]);

  // Eased, and rate-limited to what the decoder can actually serve.
  //
  // Asking for a seek on every animation frame is 60 per second. A desktop
  // GPU absorbs that; a phone decoder does not, and the backlog is what
  // makes the page feel like it is dragging — each seek arrives before the
  // last one has been painted, so the video falls behind the finger and
  // the main thread stays busy. Mobile therefore seeks at ~22fps, which is
  // below the decoder's limit and still well above the eye's threshold for
  // continuous motion, and it ignores smaller deltas before bothering at
  // all. Desktop keeps the per-frame path.
  useEffect(() => {
    if (!scrubbable || !ready) return undefined;

    /* ── Phones: play, do not scrub ───────────────────────────────
       Seeking is what made this drag. Even rate-limited, every seek asks
       a phone decoder to jump to an arbitrary frame and rebuild from the
       nearest keyframe, and the file had to carry a keyframe every six
       frames to make that bearable — which spent the bitrate on keyframes
       instead of picture, so it looked poor as well as running badly.

       Scrolling instead drives ordinary forward playback: the video runs
       while the finger moves and pauses when it stops. Decoding forward is
       what the hardware is built for. Position is only corrected when the
       film has drifted well away from the scroll position — scrolling back
       up, mostly, since video cannot play backwards — and that correction
       is throttled hard.

       The mobile cut is 720p with a normal GOP now: better picture, and
       nothing seeks it frame by frame. */
    if (narrow) {
      const IDLE_MS = 170;      // finger considered lifted
      const DRIFT = 0.22;       // fraction of the film before resyncing
      const RESYNC_GAP = 700;   // ms between corrections
      let lastResync = 0;

      const tickMobile = (now) => {
        const v = videoRef.current;
        if (v && v.duration) {
          const moving = now - lastScroll.current < IDLE_MS;

          if (moving) {
            if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
          } else if (!v.paused) {
            v.pause();
          }

          const at = v.currentTime / v.duration;
          if (
            Math.abs(at - target.current) > DRIFT &&
            now - lastResync > RESYNC_GAP &&
            !v.seeking
          ) {
            lastResync = now;
            try { v.currentTime = target.current * v.duration; } catch { /* busy */ }
          }

          const cs = chaptersRef.current;
          if (cs.length) {
            const i = cs.reduce((acc, c, idx) => (target.current >= c.at ? idx : acc), 0);
            setChapter((prev) => (prev === i ? prev : i));
          }
        }
        raf.current = requestAnimationFrame(tickMobile);
      };

      raf.current = requestAnimationFrame(tickMobile);
      return () => cancelAnimationFrame(raf.current);
    }

    /* ── Pointer devices: true scrub, one seek per frame ─────────── */
    const tick = (now) => {
      const v = videoRef.current;
      if (v && v.duration) {
        current.current += (target.current - current.current) * 0.12;
        const t = current.current * v.duration;
        // Seeking to a value the decoder already sits on wastes a frame.
        if (!v.seeking && Math.abs(v.currentTime - t) > 0.02) {
          try { v.currentTime = t; } catch { /* decoder busy; try next frame */ }
        }
        const cs = chaptersRef.current;
        if (cs.length) {
          const i = cs.reduce((acc, c, idx) => (current.current >= c.at ? idx : acc), 0);
          setChapter((prev) => (prev === i ? prev : i));
        }
      }
      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [scrubbable, ready, narrow]);

  const Copy = ({ c, i }) => (
    <div className={`sfilm__copy ${c.variant ? `sfilm__copy--${c.variant}` : ''}`}>
      {c.mark}
      <p className="t-eyebrow">{c.eyebrow}</p>
      {i === 0
        ? <h1 className="sfilm__title">{c.title}</h1>
        : <h2 className="sfilm__title">{c.title}</h2>}
      <p className="sfilm__body">{c.body}</p>
      {c.actions && <div className="sfilm__actions">{c.actions}</div>}
    </div>
  );

  /* ── Stacked fallback: a normal page, every chapter in flow ──────── */
  if (!scrubbable) {
    return (
      <section className={`sfilm sfilm--stacked ${className}`}>
        {/* A mobile-weight cut of the same take, playing. Serving the desktop
            file here would be wasteful — it carries a keyframe every six
            frames so the scrollbar can seek it, and nothing seeks on this
            branch — so `mobileSrc` is a 480p normal-GOP encode at a fifth of
            the size. A still image was worse than either: it left the whole
            landing page motionless on a phone. */}
        <div className="sfilm__still" aria-hidden="true">
          <video
            className="sfilm__video"
            poster={poster}
            muted
            playsInline
            loop
            autoPlay
            preload="metadata"
            disablePictureInPicture
          >
            <source src={mobileSrc || src} type="video/mp4" />
          </video>
          <div className="sfilm__scrim" />
        </div>

        {/* Each chapter reveals as it scrolls in. The pinned branch animates
            copy on every chapter change, but here all seven are in the DOM
            at once — firing them together on load would spend the whole
            effect before anyone had scrolled. */}
        {chapters.map((c, i) => (
          <Reveal className="wrap sfilm__stack-item" key={c.eyebrow}>
            <Copy c={c} i={i} />
          </Reveal>
        ))}
      </section>
    );
  }

  /* ── Scrubbed film ───────────────────────────────────────────────── */
  const active = chapters[chapter];

  // A phone gets its own cut, and a shorter track: 620vh of thumb-work is a
  // long way to drag on a small screen.
  //
  // The 2K cut is the default on a phone — modern handsets run at a device
  // pixel ratio of 3, so a 720p plate is genuinely soft on them. It is only
  // affordable because this branch plays rather than seeks. Anyone who has
  // asked to save data, or is on a measured connection, still gets the 720p
  // file: shipping 5 MB to someone on 3G is not a quality decision, it is a
  // bill.
  const playSrc = narrow
    ? (thrifty ? mobileSrc : (mobileSrcHq || mobileSrc)) || src
    : src;
  const trackHeight = narrow ? '420vh' : height;

  return (
    <section ref={sectionRef} className={`sfilm ${className}`} style={{ height: trackHeight }}>
      <div className="sfilm__pin">
        <video
          ref={videoRef}
          key={playSrc}
          className="sfilm__video"
          poster={poster}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          onLoadedMetadata={() => setReady(true)}
          onError={() => setReady(false)}
        >
          {/* MP4 first here, which inverts the rule the other scenes use.
              Forcing a keyframe every six frames for scrubbing makes VP9
              larger than H.264 on this clip, so preferring WebM would serve
              the heavier file for no benefit. */}
          <source src={playSrc} type="video/mp4" />
        </video>

        <div className="sfilm__scrim" aria-hidden="true" />

        {active && (
          <div className="wrap sfilm__inner" key={active.eyebrow}>
            <Copy c={active} i={chapter} />
          </div>
        )}

        {chapters.length > 0 && (
          <div className="sfilm__rail" aria-hidden="true">
            {chapters.map((c, i) => (
              <span key={c.eyebrow} className={`sfilm__tick ${i <= chapter ? 'sfilm__tick--on' : ''}`}>
                <span className="sfilm__tick-label">{c.eyebrow}</span>
              </span>
            ))}
          </div>
        )}

        {chapter === 0 && (
          <div className="sfilm__scroll" aria-hidden="true">
            <span className="sfilm__scroll-line" />
            <span className="sfilm__scroll-label">Scroll to depart</span>
          </div>
        )}
      </div>
    </section>
  );
}
