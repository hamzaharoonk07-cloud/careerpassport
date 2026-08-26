import { useEffect, useRef, useState } from 'react';
import { useA11y } from '../../context/A11yContext.jsx';

/**
 * Display settings, behind one button.
 *
 * Four controls sitting open in the nav crowded it and competed with the
 * actual navigation. They live in a small panel now — one "Aa" affordance
 * that is still obvious, without four permanent buttons beside the links.
 *
 * Escape closes it and an outside click dismisses it, because a panel that
 * traps you is worse than no panel.
 */
export function A11yControls() {
  const { theme, fontScale, toggleTheme, biggerText, smallerText, canGrow, canShrink } = useA11y();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div className="a11y" ref={wrapRef}>
      <button
        type="button"
        className="a11y__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Display settings"
        title="Display settings"
      >
        Aa
      </button>

      {open && (
        <div className="a11y__panel" role="group" aria-label="Display settings">
          <div className="a11y__row">
            <span className="a11y__k">Text size</span>
            <div className="a11y__set">
              <button
                type="button"
                className="a11y__btn"
                onClick={smallerText}
                disabled={!canShrink}
                aria-label="Decrease text size"
              >
                A−
              </button>
              {/* Announced, not just drawn — the number is the only feedback
                  that the press did anything. */}
              <span className="a11y__val" aria-live="polite">{Math.round(fontScale * 100)}%</span>
              <button
                type="button"
                className="a11y__btn"
                onClick={biggerText}
                disabled={!canGrow}
                aria-label="Increase text size"
              >
                A+
              </button>
            </div>
          </div>

          <div className="a11y__row">
            <span className="a11y__k">Theme</span>
            <button
              type="button"
              className="a11y__btn a11y__btn--wide"
              onClick={toggleTheme}
              aria-pressed={theme === 'light'}
            >
              {theme === 'dark' ? '☀  Light' : '☾  Dark'}
            </button>
          </div>

          <p className="a11y__note">
            The journey pages stay dark — their text sits over video, where light
            type is the only legible option.
          </p>
        </div>
      )}
    </div>
  );
}
