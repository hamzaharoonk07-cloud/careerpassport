import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Accessibility preferences: the theme.
 *
 * Written to the document element rather than passed down through props,
 * because CSS is what actually consumes it: `data-theme` selects a token
 * set. No component needs to know the value.
 *
 * Stored in localStorage so the choice survives a reload. A visitor who has
 * expressed no preference gets dark — see initialTheme, which deliberately
 * does not follow the operating system.
 */

const KEY_THEME = 'cp:theme';

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

  // Dark unless the visitor asks otherwise — deliberately not following the
  // system.
  //
  // Most phones ship set to light, so following the preference meant nearly
  // every mobile visitor landed in the theme this design handles worst:
  // cream panels against video-backed pages that have to stay dark, with the
  // seam between them on show. The site is built dark; light is a setting
  // someone chooses, not the default they get handed.
  return 'dark';
}

export function A11yProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    write(KEY_THEME, theme);
  }, [theme]);


  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  }), [theme]);

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useA11y must be used inside <A11yProvider>');
  return ctx;
}
