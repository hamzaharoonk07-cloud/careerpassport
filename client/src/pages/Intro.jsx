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
            title: <>Every journey<br />needs a document.</>,
            body: 'Most people choose a career the way they choose a queue — by watching what everyone else does. This is the other way. Take the passport, answer honestly, and leave with a destination you can defend.',
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
            eyebrow: 'Stage 01 · The Terminal',
            title: 'Every gate is a career.',
            body: `The departures board is built from the careers in our database — ${destinations}, each with its own gate. Karachi is where the journey starts.`,
          },
          {
            at: 0.34,
            eyebrow: 'Stage 02 · Your Boarding Pass',
            title: 'Choose a gate. The pass is yours.',
            body: 'Pick a destination and a boarding pass is issued in your name, with your passport number, your gate and your seat.',
          },
          {
            at: 0.52,
            eyebrow: 'Stage 03 · Departure',
            title: 'Ten questions at altitude.',
            body: 'Each one measures something real — how you solve problems, where you do your best work, what you would want to be true in ten years.',
          },
          {
            at: 0.68,
            eyebrow: 'Stage 04 · En Route',
            title: 'The maths does the rest.',
            body: 'Holland-code similarity against every career in the bank, weighted against the field you chose. Deterministic, explainable, and never random.',
          },
          {
            at: 0.82,
            eyebrow: 'Stage 05 · Arrival',
            title: 'A match with a reason attached.',
            body: 'Every percentage comes with the sentence behind it, then a six-stage flight plan to get you there.',
          },
          {
            at: 0.93,
            variant: 'close',
            eyebrow: 'Ready when you are',
            title: 'Your passport is waiting.',
            body: 'Three minutes of honest answers, and you leave with a destination, a route, and the reasoning behind both.',
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
