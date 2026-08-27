import { useEffect, useRef, useState } from 'react';
import { useA11y } from '../../context/A11yContext.jsx';

/**
 * Display settings, behind one button.
 *
 * Controls sitting open in the nav crowded it and competed with the actual
 * navigation. They live in a small panel now — one "Aa" affordance that is
 * still obvious, without permanent buttons beside the links.
 *
 * Escape closes it and an outside click dismisses it, because a panel that
 * traps you is worse than no panel.
 */
export function A11yControls() {
  const { theme, toggleTheme } = useA11y();
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
