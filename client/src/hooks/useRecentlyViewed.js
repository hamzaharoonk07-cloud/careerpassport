import { useCallback, useEffect, useState } from 'react';

/**
 * Recently viewed careers.
 *
 * Kept in localStorage rather than on the server, deliberately: it is a
 * convenience, not a record. Someone reading the career bank without an
 * account should get the same benefit as someone signed in, and browsing
 * history is the kind of thing worth not collecting when you do not have
 * to. It survives a reload and never leaves the device.
 *
 * Stored as {slug, title, field, at} rather than an id, so the list can be
 * rendered without a request — the point is that it is instant.
 */
const KEY = 'cp:recent';
const LIMIT = 8;

const read = () => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Private mode, cleared storage, or something else wrote nonsense here.
    // A broken history is not worth an error.
    return [];
  }
};

const write = (list) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* private mode */ }
};

export function useRecentlyViewed() {
  const [recent, setRecent] = useState(read);

  const remember = useCallback((career) => {
    if (!career?.slug) return;
    setRecent((prev) => {
      const entry = {
        slug: career.slug,
        title: career.title,
        field: career.field?.name || '',
        at: Date.now(),
      };
      // Most recent first, and a re-visit moves it rather than duplicating it.
      const next = [entry, ...prev.filter((r) => r.slug !== career.slug)].slice(0, LIMIT);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    write([]);
    setRecent([]);
  }, []);

  // Another tab may have viewed something since this one loaded.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setRecent(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { recent, remember, clear };
}
