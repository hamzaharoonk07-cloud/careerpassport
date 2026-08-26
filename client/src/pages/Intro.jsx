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
        height="620vh"
        chapters={[
          {
            at: 0,
            variant: 'hero',
            mark: <div className="sfilm__mark"><Logo size={54} /></div>,
            eyebrow: 'PathSeeker · Aptech TechWiz',
            title: <>Your career,<br />stamped and routed.</>,
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
            eyebrow: 'Step 01 · The departures board',
            title: 'Every career is a destination.',
            body: `${careersPhrase} across ${counts?.fields || 'six'} fields, each with the skills it needs, what it pays where we have verified figures, and a route in. Search it without an account.`,
          },
          {
            at: 0.34,
            eyebrow: 'Step 02 · Your boarding pass',
            title: 'Choose a gate, and the pass is issued.',
            body: 'Technology, design, business, healthcare, finance or media. A boarding pass is printed in your name with your passport number, your gate and your seat. It is a starting point, not a commitment — the quiz can and often does route you somewhere else.',
          },
          {
            at: 0.52,
            eyebrow: 'Step 03 · Departure',
            title: 'Ten questions, taken at altitude.',
            body: 'No right answers and nothing to revise for. How you solve problems, where you do your best work, what you would want to be true in ten years. Three minutes.',
          },
          {
            at: 0.68,
            eyebrow: 'Step 04 · En route',
            title: 'How your destination is chosen.',
            body: 'Your answers become a profile across six recognised interest traits, compared against every career in the bank. The same answers always give the same result — nothing here is random, and every score can be traced back to a question you answered.',
          },
          {
            at: 0.82,
            eyebrow: 'Step 05 · Arrival',
            title: 'You land somewhere, with the reasoning.',
            body: 'Your match, why it fits, what it pays, and a six-stage route to get there. If two careers are too close to call, it says so instead of pretending to be certain.',
          },
          {
            at: 0.93,
            variant: 'close',
            eyebrow: 'Ready when you are',
            title: 'No entry without a passport.',
            body: 'Claim yours — it takes a minute, it is free, and there are no wrong answers. You leave with a career, a route, and the reasoning behind both.',
            actions: (
              <Button size="lg" to={isAuthed ? resumeRoute : '/register'}>
                {isAuthed ? 'Continue your journey' : 'Claim your passport'}
              </Button>
            ),
          },
        ]}
      />

      {/* ── What this actually does ───────────────────────────────
          The film sets the mood; it does not explain the product. This
          does, one block at a time as the reader scrolls, in plain terms
          and with the real numbers rather than claims. */}
      <section className="lp__detail">
        <div className="wrap">
          <Reveal>
            <p className="t-eyebrow">How it works</p>
            <h2 className="lp__detail-h">
              Not a personality quiz with a pretty result.
            </h2>
            <p className="lp__detail-lead">
              Every number on this site can be traced back to something you answered.
              Here is exactly what happens, in order.
            </p>
          </Reveal>

          <div className="lp__steps">
            {[
              {
                n: '01',
                k: 'The career bank',
                d: `${counts ? counts.careers : 'Every'} careers across ${counts?.fields || 'six'} fields, each one written out properly — what the work actually involves, the skills it needs, what it pays where we hold a verified figure, and a six-stage route in. Search it, filter it, and read any of it without an account.`,
                note: 'Where we have no salary data we say so, rather than printing a number nobody checked.',
              },
              {
                n: '02',
                k: 'Ten questions',
                d: 'No right answers and nothing to revise. Each question measures one thing — how you solve problems, where you do your best work, what you would want to be true in ten years. Three minutes, and you can retake it whenever you like.',
                note: 'The bank holds three phrasings of every question, so a retake asks you different ones rather than the same ten again.',
              },
              {
                n: '03',
                k: 'How the match is made',
                d: 'Your answers build a profile across six recognised interest traits. That profile is compared against every career in the bank, weighted with the field you chose. The same answers always produce the same result.',
                note: 'Nothing is random and no model is guessing — the arithmetic is fixed and inspectable.',
              },
              {
                n: '04',
                k: 'It tells you when it is unsure',
                d: 'If your top two careers land within a few points of each other, the result says so plainly instead of dressing a coin-flip up as a verdict. It names the one trait that separates them, so you know what the real question is.',
                note: 'A score under 55% is reported as the best available match, not a strong one.',
              },
              {
                n: '05',
                k: 'What you leave with',
                d: 'A career, the reasoning behind it in sentences you can argue with, a side-by-side against the runner-up, and a six-stage route from where you are now to doing the job.',
                note: 'Bookmark anything, and it is waiting in your case when you come back.',
              },
            ].map((step, i) => (
              <Reveal className="lp__step" key={step.n} delay={i * 60}>
                <span className="lp__step-n">{step.n}</span>
                <div>
                  <h3 className="lp__step-k">{step.k}</h3>
                  <p className="lp__step-d">{step.d}</p>
                  <p className="lp__step-note">{step.note}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* The one thing a visitor has to do, said plainly at the end of
              the explanation rather than assumed. */}
          <Reveal className="lp__gate">
            <p className="t-eyebrow">One requirement</p>
            <h3 className="lp__gate-h">You need a passport to get guidance.</h3>
            <p className="lp__gate-p">
              Reading the career bank needs nothing. Being matched does — the quiz has to know
              whose answers these are to score them, keep your result, and have it waiting when
              you come back. That is what the passport is: a free account, issued in about a
              minute, with a number of your own.
            </p>
            <div className="lp__gate-actions">
              <Button size="lg" to="/register">Claim your passport</Button>
              <Button variant="ghost" to="/careers">Or just read the board first</Button>
            </div>
          </Reveal>

          <Reveal className="lp__who">
            <h3 className="lp__step-k">Who it is for</h3>
            <div className="lp__who-grid">
              <div><strong>Students</strong><span>Choosing subjects, or a degree, with no idea what it leads to.</span></div>
              <div><strong>Graduates</strong><span>Finished, qualified, and still not sure which door to knock on.</span></div>
              <div><strong>Professionals</strong><span>Already working, wondering whether to change direction and what it would cost.</span></div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
