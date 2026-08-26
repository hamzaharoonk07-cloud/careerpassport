import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { DepartureBoard } from '../components/brand/DepartureBoard.jsx';
import { BoardingPass } from '../components/brand/BoardingPass.jsx';
import { FlightSequence } from '../components/brand/FlightSequence.jsx';
import { FieldIcon } from '../components/brand/FieldIcon.jsx';
import { careerService } from '../services/career.service.js';
import { quizService } from '../services/quiz.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import '../styles/airport.css';

/** The four terminal actions from the brief. */
const ACTIONS = [
  { key: 'explore', icon: 'cpu', title: 'Explore Careers', sub: 'Choose your destination' },
  { key: 'journey', icon: 'line-chart', title: 'Your Journey', sub: 'Track your progress' },
  { key: 'pass', icon: 'briefcase', title: 'Boarding Pass', sub: 'Your future awaits' },
  { key: 'profile', icon: 'heart-pulse', title: 'My Profile', sub: 'Update your info' },
];

/**
 * The airport terminal.
 *
 * The departures board is built from the careers in the database — gates are
 * generated from position, so eight careers fill A1–A8 and thirty-eight fill
 * the board across five pages without anything being hardcoded.
 *
 * Choosing a destination issues a boarding pass, plays the flight, and lands
 * on that career's page. The selection is also written to the user's profile
 * through the existing endpoint, so the recommendation engine still receives
 * its chosen-field weight.
 */
export default function Airport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chooseField, advance } = useJourney();

  const [careers, setCareers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);   // { career, index }
  const [flying, setFlying] = useState(false);
  // The last flight this traveller completed, or null if they have not flown.
  const [landed, setLanded] = useState(null);
  const passRef = useRef(null);

  useEffect(() => {
    advance('station');
    let alive = true;

    // Where this traveller last landed. The endpoint answers 404 before the
    // first quiz, which is the ordinary case rather than a fault — a null
    // result simply means the board still shows departures.
    quizService
      .latestResult()
      .then((r) => { if (alive) setLanded(r); })
      .catch(() => { if (alive) setLanded(null); });

    careerService
      .list({ limit: 60 })
      .then((res) => {
        if (!alive) return;
        const sorted = [...(res.careers || [])].sort(
          (a, b) =>
            (a.field?.order ?? 99) - (b.field?.order ?? 99) ||
            a.title.localeCompare(b.title)
        );
        setCareers(sorted);
      })
      .catch((err) => alive && setError(apiError(err)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [advance]);

  const select = (career, index) => {
    setSelected({ career, index });
    // Persist the field behind this destination so the engine keeps its
    // 10% chosen-field weight. A failure here must not block the journey.
    if (career.field?.slug) chooseField(career.field.slug).catch(() => {});
    setTimeout(() => passRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  const board = () => {
    advance('boarded');
    setFlying(true);
  };

  const arrive = () => {
    setFlying(false);
    // The report is the end of the journey, not the middle of it. Before the
    // quiz existed upstream of the gates this landed on the career page,
    // which was the only thing there was to show; now the flight has a result
    // waiting behind it and that is what the traveller came for.
    navigate('/result', { state: { arrivedByFlight: true, slug: selected.career.slug } });
  };

  if (loading) {
    return (
      <main className="apt">
        <div className="center-screen"><p className="t-low">Opening the terminal…</p></div>
      </main>
    );
  }

  if (error && !careers.length) {
    return (
      <main className="apt">
        <div className="center-screen wrap-narrow" style={{ textAlign: 'center' }}>
          <div>
            <h1 className="t-h2">The board is down</h1>
            <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>{error}</p>
            <div style={{ marginTop: 'var(--sp-6)' }}>
              <Button onClick={() => window.location.reload()}>Try again</Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!careers.length) {
    return (
      <main className="apt">
        <div className="center-screen wrap-narrow" style={{ textAlign: 'center' }}>
          <div>
            <h1 className="t-h2">No departures scheduled</h1>
            <p className="t-lead" style={{ marginTop: 'var(--sp-4)', marginInline: 'auto' }}>
              There are no careers in the database yet. Seed them and the board fills itself.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // A result row with no matches would satisfy `landed` while having nothing
  // to show, so the arrival itself is what the terminal branches on.
  const arrival = landed?.matches?.[0] || null;

  if (flying) {
    return (
      <FlightSequence
        user={user}
        career={selected.career}
        index={selected.index}
        onArrive={arrive}
        onSkip={arrive}
      />
    );
  }

  return (
    <main className="apt">
      <SceneVideo src="/videos/terminal.mp4" poster="/images/terminal.jpg" loop />

      <div className="wrap apt__inner">
        <header className="apt__head">
          <div>
            <p className="t-eyebrow">Passport {user?.passportNumber} · cleared for travel</p>
            <h1 className="apt__welcome">
              {arrival ? 'Welcome back' : 'Welcome to your journey'}
            </h1>
            <p className="apt__loc">
              <span aria-hidden="true">📍</span>{' '}
              {arrival
                ? `Arrivals · ${arrival.career.title}`
                : 'International Terminal · Karachi, Pakistan'}
            </p>
          </div>
        </header>

        <div className="apt__actions">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              className="apt__action"
              onClick={() => {
                if (a.key === 'explore') {
                  // Before the quiz there is no board to scroll to.
                  if (arrival) document.querySelector('.board3')?.scrollIntoView({ behavior: 'smooth' });
                  else navigate('/quiz');
                }
                if (a.key === 'journey') navigate('/dashboard');
                if (a.key === 'pass') {
                  if (arrival) passRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  else navigate('/quiz');
                }
                if (a.key === 'profile') navigate('/dashboard');
              }}
            >
              <span className="apt__action-icon"><FieldIcon name={a.icon} size={20} /></span>
              <span className="apt__action-title">{a.title}</span>
              <span className="apt__action-sub">{a.sub}</span>
            </button>
          ))}
        </div>

        {arrival && (
          <section className="apt__landed">
            <p className="t-eyebrow">Where you landed</p>
            <h2 className="apt__landed-title">{arrival.career.title}</h2>
            <p className="apt__landed-sub">
              {arrival.career.field?.name}
              {' · '}
              {arrival.score}% match
            </p>
            <div className="row" style={{ flexWrap: 'wrap', marginTop: 'var(--sp-5)' }}>
              <Button to="/result">See your result</Button>
              <Button variant="ghost" to={`/careers/${arrival.career.slug}`}>
                Open this career
              </Button>
            </div>
          </section>
        )}

        {!arrival ? (
          /*
           * The board stays closed until the questions are answered.
           *
           * Thirty-eight gates shown to someone who has not told us anything
           * about themselves is a list, not guidance — they would pick by the
           * job title they already recognised, which is the exact habit this
           * product exists to interrupt. Answer first, and the gates mean
           * something when they open.
           */
          <section className="apt__checkin">
            <p className="t-eyebrow">Check in</p>
            <h2 className="apt__landed-title">Before the gates open</h2>
            <p className="t-lead" style={{ marginTop: 'var(--sp-4)' }}>
              The board is showing no destinations for you yet. Answer the
              questions about what you actually enjoy, and it fills with the
              gates that fit you rather than all thirty-eight at once.
            </p>
            <div className="row" style={{ flexWrap: 'wrap', marginTop: 'var(--sp-5)' }}>
              <Button size="lg" to="/quiz">Answer the questions</Button>
              <Button variant="ghost" to="/careers">Browse the career bank instead</Button>
            </div>
          </section>
        ) : (
        <div className="apt__grid">
          <DepartureBoard
            careers={careers}
            onSelect={select}
            selectedSlug={selected?.career.slug || null}
            page={page}
            onPageChange={setPage}
          />

          <div ref={passRef}>
            {selected ? (
              <div style={{ display: 'grid', gap: 'var(--sp-5)', justifyItems: 'start' }}>
                <BoardingPass user={user} career={selected.career} index={selected.index} issued />
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <Button size="lg" onClick={board}>Board your flight</Button>
                  <Button variant="ghost" onClick={() => setSelected(null)}>Choose another gate</Button>
                </div>
              </div>
            ) : (
              <p className="t-mid" style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
                Choose a career gate above and your boarding pass is issued here.
              </p>
            )}
          </div>
        </div>
        )}
      </div>
    </main>
  );
}
