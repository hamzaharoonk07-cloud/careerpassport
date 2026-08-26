import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CinematicIntro } from '../components/media/CinematicIntro.jsx';
import { ScrollFilm } from '../components/media/ScrollFilm.jsx';
import { Button } from '../components/primitives/Button.jsx';
import { Logo } from '../components/brand/Logo.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
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
        portraitSrc="/videos/journey-portrait.mp4"
        mobileSrcHq="/videos/journey-2k.mp4"
        poster="/images/journey.jpg"
        height="900vh"
        chapters={[
          {
            at: 0,
            variant: 'hero',
            mark: <div className="sfilm__mark"><Logo size={54} /></div>,
            eyebrow: 'PathSeeker · Aptech TechWiz',
            title: <>Your career,<br />stamped and routed.</>,
            body: `Career guidance for students, graduates and working professionals. Ten honest questions, matched against ${careersPhrase} — with the reasoning, the trade-offs and the route in.`,
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
            at: 0.11,
            eyebrow: 'Step 01 · The departures board',
            title: 'Every career is a destination.',
            body: `${careersPhrase} across ${counts?.fields || 'six'} fields — what the work involves, the skills it needs, what it pays where we hold a verified figure, and a route in. Where we have no salary data we say so rather than printing a number nobody checked.`,
          },
          {
            at: 0.22,
            eyebrow: 'Step 02 · Your boarding pass',
            title: 'Choose a gate. The pass is issued.',
            body: 'Technology, design, business, healthcare, finance or media. Printed in your name with your passport number, your gate and your seat — a starting point, not a commitment. The quiz can and often does route you somewhere else.',
          },
          {
            at: 0.34,
            eyebrow: 'Step 03 · Departure',
            title: 'Ten questions, taken at altitude.',
            body: 'No right answers and nothing to revise. How you solve problems, where you do your best work, what you would want true in ten years. Three minutes — and the bank holds three phrasings of every question, so a retake asks different ones.',
          },
          {
            at: 0.47,
            eyebrow: 'Step 04 · En route',
            title: 'How your destination is chosen.',
            body: 'Your answers build a profile across six recognised interest traits, compared against every career in the bank and weighted with the field you chose. The same answers always give the same result — nothing is random, and every score traces back to a question you answered.',
          },
          {
            at: 0.60,
            eyebrow: 'Step 05 · Turbulence',
            title: 'It tells you when it is unsure.',
            body: 'If your top two land within a few points, it says so plainly instead of dressing a coin-flip as a verdict — and names the one trait that separates them, so you know what the real question is. A score under 55% is reported as the best available match, not a strong one.',
          },
          {
            at: 0.73,
            eyebrow: 'Step 06 · Arrival',
            title: 'You land somewhere, with the reasoning.',
            body: 'A career, why it fits in sentences you can argue with, a side-by-side against the runner-up, and a six-stage route from where you are now to doing the job. Bookmark anything and it is waiting in your case when you come back.',
          },
          {
            at: 0.85,
            eyebrow: 'Who it is for',
            title: 'Students, graduates, professionals.',
            body: 'Choosing subjects with no idea what they lead to. Qualified and still unsure which door to knock on. Already working and wondering whether to change direction, and what it would cost.',
          },
          {
            at: 0.94,
            variant: 'close',
            eyebrow: 'One requirement',
            title: 'No entry without a passport.',
            body: 'Reading the board needs nothing. Being matched needs a passport — the quiz has to know whose answers these are to score them and keep your result. Free, and about a minute.',
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
