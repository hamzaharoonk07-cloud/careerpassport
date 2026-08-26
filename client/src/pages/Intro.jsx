import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CinematicIntro } from '../components/media/CinematicIntro.jsx';
import { ScrollFilm } from '../components/media/ScrollFilm.jsx';
import { Button } from '../components/primitives/Button.jsx';
import { Logo } from '../components/brand/Logo.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import './Intro.css';

export default function Intro() {
  const navigate = useNavigate();
  const { user, isAuthed, loading } = useAuth();
  const { introSeen, markIntroSeen, soundOn, toggleSound, resumeRoute } = useJourney();

  const [playing, setPlaying] = useState(!introSeen);

  // The headline counts are facts about the database, so they are read from
  // it rather than written into the copy. Until the call lands the sentence
  // is phrased without a number — an invented count would be worse than none.
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get('/careers', { params: { limit: 1 } }),
      api.get('/career-fields'),
    ])
      .then(([c, f]) => {
        if (!alive) return;
        setCounts({ careers: c.data.total, fields: (f.data.fields || []).length });
      })
      .catch(() => { /* leave counts null; the copy reads without them */ });
    return () => { alive = false; };
  }, []);

  const handleIntroDone = () => {
    markIntroSeen();
    setPlaying(false);
  };

  if (playing) {
    return <CinematicIntro onComplete={handleIntroDone} soundOn={soundOn} onToggleSound={toggleSound} />;
  }

  const destinations = counts ? `${counts.careers} destinations` : 'every destination in the bank';
  // Plain wording for the sentences that explain the product, where the
  // airport metaphor would get in the way of being understood.
  const careersPhrase = counts ? `${counts.careers} real careers` : 'every career in the bank';
  // Says what the visitor gets, not what they do. "Browse careers" sat
  // outside the airport world and left two unlabelled doors side by side.
  const browseLabel = counts
    ? `Just looking? See all ${counts.careers} destinations →`
    : 'Just looking? See every destination →';

  return (
    <main className="lp">
      {/* One unbroken take, scrubbed by the scrollbar from the top of the page
          through to the passport. The chapter timings are where each beat
          actually lands in the clip. */}
      <ScrollFilm
        src="/videos/journey.mp4"
        mobileSrc="/videos/journey-m.mp4"
        mobileSrcHq="/videos/journey-2k.mp4"
        poster="/images/journey.jpg"
        height="620vh"
        chapters={[
          {
            at: 0,
            variant: 'hero',
            mark: <div className="sfilm__mark"><Logo size={54} /></div>,
            eyebrow: 'PathSeeker · Aptech TechWiz',
            title: <>Find the career<br />that actually fits you.</>,
            body: `PathSeeker is a career guidance tool for students, graduates and working professionals. Answer ten honest questions and it matches you against ${careersPhrase} — then tells you why, what you would be giving up, and the exact steps to get there.`,
            actions: loading ? (
              <p className="t-low">Checking your session…</p>
            ) : isAuthed ? (
              <>
                <Button size="lg" onClick={() => navigate(resumeRoute)}>Continue your journey</Button>
                <Button variant="secondary" size="lg" to="/careers">See all destinations</Button>
                <p className="sfilm__note">
                  Welcome back, {user.name.split(' ')[0]}. Passport <strong>{user.passportNumber}</strong>.
                </p>
              </>
            ) : (
              <>
                <Button size="lg" to="/register">Claim your passport</Button>
                <Button variant="secondary" size="lg" to="/login">I already have one</Button>
                <p className="sfilm__note">
                  <Button variant="ghost" to="/careers">{browseLabel}</Button>
                </p>
              </>
            ),
          },
          {
            at: 0.16,
            eyebrow: 'Step 01 · Explore',
            title: 'Browse every career on the board.',
            body: `${careersPhrase} across ${counts?.fields || 'six'} fields, each with the skills it needs, what it pays where we have verified figures, and a route in. Search it without an account.`,
          },
          {
            at: 0.34,
            eyebrow: 'Step 02 · Choose a direction',
            title: 'Pick the field you are drawn to.',
            body: 'Technology, design, business, healthcare, finance or media. It is a starting point, not a commitment — the quiz can and often does point somewhere else.',
          },
          {
            at: 0.52,
            eyebrow: 'Step 03 · The quiz',
            title: 'Ten questions about how you actually work.',
            body: 'No right answers and nothing to revise for. How you solve problems, where you do your best work, what you would want to be true in ten years. Three minutes.',
          },
          {
            at: 0.68,
            eyebrow: 'Step 04 · The matching',
            title: 'How the match is worked out.',
            body: 'Your answers become a profile across six recognised interest traits, compared against every career in the bank. The same answers always give the same result — nothing here is random, and every score can be traced back to a question you answered.',
          },
          {
            at: 0.82,
            eyebrow: 'Step 05 · Your result',
            title: 'A career, and the reasoning behind it.',
            body: 'Your match, why it fits, what it pays, and a six-stage route to get there. If two careers are too close to call, it says so instead of pretending to be certain.',
          },
          {
            at: 0.93,
            variant: 'close',
            eyebrow: 'Ready when you are',
            title: 'Start with ten questions.',
            body: 'Free, no wrong answers, and you can retake it whenever you want. You leave with a career, a route, and the reasoning behind both.',
            actions: (
              <Button size="lg" to={isAuthed ? resumeRoute : '/register'}>
                {isAuthed ? 'Continue your journey' : 'Claim your passport'}
              </Button>
            ),
          },
        ]}
      />
    </main>
  );
}
