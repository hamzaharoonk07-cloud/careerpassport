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

  const [ready, setReady] = useState(false);
  const [scrubbable, setScrubbable] = useState(false);
  const [chapter, setChapter] = useState(0);

  // The loop below reads the chapter list every frame but must not restart
  // when it changes identity. Callers pass an array literal, so `chapters` is
  // a new object on every render — listing it as a dependency would cancel and
  // re-request the animation frame each time setChapter re-renders us, which
  // is enough seek-then-abort churn to stall the decoder.
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  // Decide once whether this device can scrub at all.
  useEffect(() => {
    if (reduced) { setScrubbable(false); return; }
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 900;
    setScrubbable(!coarse && !narrow);
  }, [reduced]);

  // Track scroll progress through the section.
  useEffect(() => {
    if (!scrubbable) return undefined;

    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      target.current = Math.min(1, Math.max(0, -rect.top / scrollable));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [scrubbable]);

  // One seek per frame, eased.
  useEffect(() => {
    if (!scrubbable || !ready) return undefined;

    const tick = () => {
      const v = videoRef.current;
      if (v && v.duration) {
        current.current += (target.current - current.current) * 0.12;
        const t = current.current * v.duration;
        // Seeking to a value the decoder already sits on wastes a frame.
        if (Math.abs(v.currentTime - t) > 0.02) {
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
  }, [scrubbable, ready]);

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

  return (
    <section ref={sectionRef} className={`sfilm ${className}`} style={{ height }}>
      <div className="sfilm__pin">
        <video
          ref={videoRef}
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
          <source src={src} type="video/mp4" />
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
