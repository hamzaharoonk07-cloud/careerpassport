import { useEffect, useRef, useState } from 'react';
import { Button } from '../primitives/Button.jsx';
import { useReveal } from '../../hooks/useReveal.js';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';
import '../../styles/briefcase.css';

const NOTE_COUNT = 12;

/**
 * The briefcase, opening as you scroll to it.
 *
 * No click. By the time someone reaches the foot of their result they have
 * already decided to read it — asking for one more press before the payoff
 * is a gate, not an interaction, and it was the thing standing between the
 * reader and the only part of the page they take away.
 *
 * Scrolling it into view is the trigger. Reduced motion gets it open from
 * the start rather than a lid that never moves.
 */
export function CaseReveal({ career, score }) {
  const reduced = useReducedMotion();
  const [ref, seen] = useReveal({ threshold: 0.35 });
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!seen || open) return;

    if (reduced) {
      setUnlocked(true);
      setOpen(true);
      return;
    }

    // The latches let go first, then the lid. Opening both at once reads as
    // a card fading in; the beat between them is what makes it a case.
    timers.current.push(setTimeout(() => setUnlocked(true), 220));
    timers.current.push(setTimeout(() => setOpen(true), 700));
  }, [seen, open, reduced]);

  const notes = Array.from({ length: NOTE_COUNT }, (_, i) => ({
    nx: `${(i % 6) * 22 - 55}px`,
    ny: `${-90 - (i % 4) * 42}px`,
    nr: `${(i % 2 ? 1 : -1) * (25 + i * 9)}deg`,
    delay: `${520 + i * 70}ms`,
  }));

  return (
    <section
      ref={ref}
      className={`bc bc--inline ${unlocked ? 'bc--unlocked' : ''} ${open ? 'bc--open' : ''}`}
    >
      <div className="bc__inner">
        <header className="bc__head">
          <p className="t-eyebrow">One thing left</p>
          <h3 className="bc__title bc__title--inline">
            {open ? 'Your future is worth carrying.' : 'Keep scrolling.'}
          </h3>
        </header>

        <div className="bc__stage">
          {/* The clip only makes sense once the case is open — before that
              the CSS case is the object doing the work. */}
          {open && (
            <video
              className="bc__video"
              autoPlay
              muted
              playsInline
              poster="/images/briefcase.jpg"
              preload="none"
            >
              <source src="/videos/briefcase.webm" type="video/webm" />
              <source src="/videos/briefcase.mp4" type="video/mp4" />
            </video>
          )}

          <div className="bc__case">
            <div className="bc__body"><span className="bc__stitch" /></div>

            <span className="bc__glow" aria-hidden="true" />

            <div className="bc__contents">
              {career ? (
                <>
                  <span className="bc__contents-role">{career.title}</span>
                  <span className="bc__contents-sub">
                    {score}% match · {career.field?.name}
                  </span>
                </>
              ) : (
                <span className="bc__contents-sub">Take the quiz to fill this case</span>
              )}
            </div>

            <div className="bc__notes" aria-hidden="true">
              {notes.map((n, i) => (
                <span
                  key={i}
                  className="note"
                  style={{ '--nx': n.nx, '--ny': n.ny, '--nr': n.nr, animationDelay: n.delay }}
                />
              ))}
            </div>

            <div className="bc__lid">
              <span className="bc__plate" />
              <span className="bc__lock" />
            </div>
          </div>
        </div>

        {open && (
          <div className="bc__actions" style={{ marginTop: 'var(--sp-6)' }}>
            <Button size="lg" to="/briefcase">Take it with you</Button>
            <Button variant="secondary" to="/roadmap">See the route</Button>
          </div>
        )}
      </div>
    </section>
  );
}
