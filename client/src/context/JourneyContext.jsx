import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const JourneyContext = createContext(null);

/** The journey in order. Index position is what decides "further along". */
export const STAGES = [
  'registered',
  'stamped',
  'station',
  'boarded',
  'field-selected',
  'quiz',
  'analysed',
  'result',
  'roadmap',
  'complete',
];

/** Which route each stage resumes to, so a refresh lands where you left off. */
export const STAGE_ROUTES = {
  registered: '/passport',
  stamped: '/airport',
  station: '/airport',
  boarded: '/airport',
  'field-selected': '/quiz',
  quiz: '/quiz',
  analysed: '/result',
  result: '/result',
  roadmap: '/roadmap',
  complete: '/dashboard',
};

const LOCAL_KEY = 'pathseeker.journey';

/**
 * Tracks progress through the cinematic journey.
 *
 * Written to localStorage on every change AND pushed to the server, so a
 * dropped connection mid-quiz never costs the user their place, and signing
 * in on another device picks up where they were.
 */
export function JourneyProvider({ children }) {
  const { user, isAuthed, patchUser } = useAuth();

  const [stage, setStageLocal] = useState('registered');
  const [selectedField, setSelectedField] = useState(null);
  const [introSeen, setIntroSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}').introSeen === true;
    } catch {
      return false;
    }
  });
  const [soundOn, setSoundOn] = useState(false);

  // The server is the source of truth once we know who the user is.
  useEffect(() => {
    if (user?.journeyStage) setStageLocal(user.journeyStage);
  }, [user?.journeyStage]);

  const persistLocal = useCallback((patch) => {
    try {
      const prev = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...prev, ...patch }));
    } catch {
      // Private browsing and disabled storage are fine — the server still has it.
    }
  }, []);

  /** Advances the journey. Never moves backwards. */
  const advance = useCallback(
    async (next) => {
      if (STAGES.indexOf(next) <= STAGES.indexOf(stage)) return;
      setStageLocal(next);
      persistLocal({ stage: next });
      if (!isAuthed) return;
      try {
        const { data } = await api.patch('/users/me/journey', { stage: next });
        patchUser({ journeyStage: data.journeyStage });
      } catch {
        // A failed sync is not worth interrupting the experience for —
        // local state carries the user forward and the next call retries.
      }
    },
    [stage, isAuthed, persistLocal, patchUser]
  );

  const chooseField = useCallback(
    async (fieldSlug) => {
      const { data } = await api.patch('/users/me/field', { fieldSlug });
      setSelectedField(data.selectedField);
      setStageLocal(data.journeyStage);
      persistLocal({ stage: data.journeyStage, fieldSlug });
      patchUser({ journeyStage: data.journeyStage, selectedField: data.selectedField._id });
      return data.selectedField;
    },
    [persistLocal, patchUser]
  );

  const markIntroSeen = useCallback(() => {
    setIntroSeen(true);
    persistLocal({ introSeen: true });
  }, [persistLocal]);

  const resetJourney = useCallback(() => {
    setStageLocal('registered');
    setSelectedField(null);
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch { /* nothing to clear */ }
  }, []);

  const value = useMemo(
    () => ({
      stage,
      stageIndex: STAGES.indexOf(stage),
      advance,
      isAtLeast: (s) => STAGES.indexOf(stage) >= STAGES.indexOf(s),
      resumeRoute: STAGE_ROUTES[stage] || '/passport',
      selectedField,
      chooseField,
      introSeen,
      markIntroSeen,
      soundOn,
      toggleSound: () => setSoundOn((s) => !s),
      resetJourney,
    }),
    [stage, advance, selectedField, chooseField, introSeen, markIntroSeen, soundOn, resetJourney]
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used inside <JourneyProvider>');
  return ctx;
}
