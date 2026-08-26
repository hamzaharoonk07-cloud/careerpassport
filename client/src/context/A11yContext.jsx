import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Accessibility preferences: theme and text size.
 *
 * Both are written to the document element rather than passed down through
 * props, because CSS is what actually consumes them — `data-theme` selects a
 * token set, `--fs-scale` moves the root font size, and every rem in the type
 * scale follows. No component needs to know either value.
 *
 * Stored in localStorage so the choice survives a reload. A visitor who has
 * expressed no preference gets whatever their operating system asks for, and
 * keeps following it until they choose for themselves.
 */

const KEY_THEME = 'cp:theme';
const KEY_SCALE = 'cp:fontScale';

export const FONT_STEPS = [0.9, 1, 1.15, 1.3];

const A11yContext = createContext(null);

/** localStorage throws in some privacy modes; a preference is never worth a crash. */
const read = (key) => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const write = (key, value) => {
  try { window.localStorage.setItem(key, value); } catch { /* private mode */ }
};

function initialTheme() {
  const stored = read(KEY_THEME);
  if (stored === 'light' || stored === 'dark') return stored;
  // No stored choice — follow the system. The site is designed dark, so that
  // is the fallback when the query is unavailable.
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

function initialScale() {
  const n = Number(read(KEY_SCALE));
  return FONT_STEPS.includes(n) ? n : 1;
}

export function A11yProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  const [fontScale, setFontScale] = useState(initialScale);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    write(KEY_THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--fs-scale', String(fontScale));
    write(KEY_SCALE, String(fontScale));
  }, [fontScale]);

  // Keep following the system until the visitor states a preference.
  useEffect(() => {
    if (read(KEY_THEME)) return undefined;
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return undefined;
    const onChange = (e) => setTheme(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const value = useMemo(() => {
    const i = FONT_STEPS.indexOf(fontScale);

    // Stepped from the previous value rather than the one captured at render.
    // Reading `fontScale` from this closure meant two quick presses both
    // computed from the same starting index and the second was a no-op — the
    // control silently ate every click faster than a re-render.
    const step = (delta) =>
      setFontScale((prev) => {
        const at = FONT_STEPS.indexOf(prev);
        const next = Math.min(Math.max(at + delta, 0), FONT_STEPS.length - 1);
        return FONT_STEPS[next];
      });

    return {
      theme,
      fontScale,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      biggerText: () => step(1),
      smallerText: () => step(-1),
      canGrow: i < FONT_STEPS.length - 1,
      canShrink: i > 0,
    };
  }, [theme, fontScale]);

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useA11y must be used inside <A11yProvider>');
  return ctx;
}
