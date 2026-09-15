import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/primitives/Button.jsx';
import { SceneVideo } from '../components/media/SceneVideo.jsx';
import { DepartureBoard, DemandMeter, salaryBand } from '../components/brand/DepartureBoard.jsx';
import { BoardingPass } from '../components/brand/BoardingPass.jsx';
import { FlightSequence } from '../components/brand/FlightSequence.jsx';
import { Itinerary } from '../components/brand/Itinerary.jsx';
import { Wayfinding } from '../components/brand/Wayfinding.jsx';
import { careerService } from '../services/career.service.js';
import { quizService } from '../services/quiz.service.js';
import { apiError } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import { FlightLoader, useLanding } from '../components/brand/FlightLoader.jsx';
import { TabBar } from '../components/layout/TabBar.jsx';
import '../styles/airport.css';
import '../styles/terminal.css';

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
  const [showAll, setShowAll] = useState(false);
  const passRef = useRef(null);
  const boardRef = useRef(null);
  // The monitor's clock. A minute is the resolution anyone reads it at.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

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
      .list({ limit: 200 })
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

  useEffect(() => { setPage(0); }, [showAll]);

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
    // In the URL rather than router state, so a refresh on the report keeps
    // showing the career that was flown to.
    navigate(`/result?career=${encodeURIComponent(selected.career.slug)}`);
  };


  // A result row with no matches would satisfy `landed` while having nothing
  // to show, so the arrival itself is what the terminal branches on.
  const arrival = landed?.matches?.[0] || null;
  const firstName = user?.name?.split(' ')[0] || 'traveller';
  const matchScores = useMemo(
    () => new Map((landed?.matches || []).map((m) => [m.career.slug, m.score])),
    [landed]
  );

  /**
   * The gates the quiz actually pointed at.
   *
   * Thirty-eight destinations is a directory. Once the questions have been
   * answered we know which field the traveller leans toward and how each
   * career inside it scored, so the board shows that field, best match first.
   * The rest are still reachable - a match is a starting point, not a verdict,
   * and someone who wants to look at everything should be able to.
   */
  /**
   * Which field the board opens on.
   *
   * The declaration at customs wins, because it is the traveller's own and
   * the quiz writes its answer there too. The last result's field is only a
   * fallback for accounts that flew before customs existed.
   */
  const boardField = useMemo(() => {
    const declared = careers.find((c) => String(c.field?._id) === String(user?.selectedField))?.field;
    return declared || arrival?.career.field || null;
  }, [careers, user?.selectedField, arrival]);

  const gateCareers = useMemo(() => {
    if (!boardField || showAll) return careers;
    const field = boardField.slug;
    if (!field) return careers;
    const scored = new Map((landed?.matches || []).map((m) => [m.career.slug, m.score]));
    const inField = careers.filter((c) => c.field?.slug === field);
    // If the field somehow holds nothing, showing an empty board would be
    // worse than showing everything.
    if (!inField.length) return careers;
    return [...inField].sort(
      (a, b) => (scored.get(b.slug) ?? -1) - (scored.get(a.slug) ?? -1) || a.title.localeCompare(b.title)
    );
  }, [careers, boardField, landed, showAll]);

  // Everything above this line runs on every render. React counts hooks by
  // call order, so a hook placed below one of the early returns is called on
  // some renders and not others, and the component tears itself down as soon
  // as the data arrives. The gate list and its state have to live up here.

  // Hold the loader until its climb resolves, then show the page.
  const { held, landing } = useLanding(loading);
  if (held) {
    return (
      <main className="apt">
        <div className="center-screen"><FlightLoader label="Opening the terminal" {...landing} /></div>
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
        <section className="thero">
          <div>
            <Itinerary current={selected ? 2 : boardField ? 2 : 1} />
            <h1 className="thero__greet">
              Welcome {arrival ? 'back' : 'aboard'},
              <span>{firstName}.</span>
            </h1>
            <p className="thero__lead">
              {boardField
                ? `The ${boardField.name} gates are open. Pick the career you want to fly to and we'll print your boarding pass and the full report.`
                : 'Your passport is cleared. Tell us which field you want to explore and the departures board opens on its gates.'}
            </p>
          </div>

          <aside className="finfo" aria-label="Flight information">
            <div className="finfo__head">
              <span>Flight information</span>
              <span className="finfo__clock">
                {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <dl className="finfo__rows">
              <div className="finfo__row">
                <dt>Passenger</dt>
                <dd>{user?.name}</dd>
              </div>
              <div className="finfo__row">
                <dt>Field</dt>
                <dd className="finfo__big">{boardField?.name || 'Not chosen'}</dd>
              </div>
              <div className="finfo__row">
                <dt>Gates</dt>
                <dd>{boardField ? `${careers.filter((c) => c.field?.slug === boardField.slug).length} open` : 'Closed'}</dd>
              </div>
              {arrival && (
                <div className="finfo__row">
                  <dt>Best match</dt>
                  <dd>{arrival.career.title} <span className="t-low">({arrival.score}%)</span></dd>
                </div>
              )}
              <div className="finfo__row">
                <dt>Passport</dt>
                <dd className="finfo__mono">{user?.passportNumber}</dd>
              </div>
              <div className="finfo__row">
                <dt>Status</dt>
                <dd>
                  <span className={`finfo__status ${selected ? '' : 'finfo__status--wait'}`}>
                    {selected ? `Boarding · ${selected.career.title}` : boardField ? 'Choose a gate' : 'Check in'}
                  </span>
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <div className="apt__sign">
          <Wayfinding
            signs={[
              boardField
                ? {
                    picto: 'departures', arrow: 'down', title: 'Departures',
                    detail: `${boardField.name} gates`,
                    onClick: () => boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                  }
                : { picto: 'departures', arrow: 'right', title: 'Check in', detail: 'Choose your field', to: '/interests' },
              {
                picto: 'pass', arrow: 'down', title: 'Boarding pass',
                detail: selected ? selected.career.title : 'Pick a gate first',
                disabled: !selected,
                onClick: () => passRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
              },
              { picto: 'change', arrow: 'right', title: 'Change field', detail: 'Or take 7 questions', to: '/interests' },
              { picto: 'lounge', arrow: 'right', title: 'Dashboard', detail: 'Your saved careers', to: '/dashboard' },
            ]}
          />
        </div>

        {!boardField ? (
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
              Tell us which field you are interested in and the board fills with
              its gates. Not sure yet? Seven quick questions will point you.
            </p>
            <div className="row" style={{ flexWrap: 'wrap', marginTop: 'var(--sp-5)' }}>
              <Button size="lg" to="/interests">Choose your field</Button>
              <Button variant="ghost" to="/quiz?mode=quick">I'm not sure — 7 questions</Button>
            </div>
          </section>
        ) : (
        <div className="apt__grid" ref={boardRef}>
          <div className="tboard__bar">
            <p className="t-mid">Tap a gate to print your boarding pass.</p>
            <div className="tboard__toggle" role="group" aria-label="Which gates to show">
              <button type="button" aria-pressed={!showAll} onClick={() => setShowAll(false)}>
                {boardField?.name}
              </button>
              <button type="button" aria-pressed={showAll} onClick={() => setShowAll(true)}>
                All fields
              </button>
            </div>
          </div>
          <DepartureBoard
            careers={gateCareers}
            onSelect={select}
            selectedSlug={selected?.career.slug || null}
            page={page}
            onPageChange={setPage}
            scores={matchScores}
          />

          <div ref={passRef} className="fl-sel-wrap">
            {selected ? (
              <div className="fl-sel">
                <BoardingPass user={user} career={selected.career} index={selected.index} issued />
                <aside className="fl-info">
                  <span className="fl-info__field">{selected.career.field?.name}</span>
                  <h3 className="fl-info__title">{selected.career.title}</h3>
                  <p className="fl-info__sum">{selected.career.summary}</p>
                  <dl className="fl-info__facts">
                    <div><dt>Demand</dt><dd><DemandMeter level={selected.career.demand?.level} /></dd></div>
                    <div><dt>Salary / month</dt><dd>{salaryBand(selected.career.salary) || 'Not available'}</dd></div>
                    {matchScores.get(selected.career.slug) != null && (
                      <div><dt>Your match</dt><dd>{matchScores.get(selected.career.slug)}%</dd></div>
                    )}
                  </dl>
                  {selected.career.skills?.length > 0 && (
                    <div className="fl-info__skills">
                      {selected.career.skills.slice(0, 4).map((sk) => <span key={sk.name}>{sk.name}</span>)}
                    </div>
                  )}
                  <div className="fl-info__actions">
                    <Button size="lg" onClick={board}>Board this flight</Button>
                    <Button variant="ghost" onClick={() => setSelected(null)}>Choose another gate</Button>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="fl-waiting">
                <span className="fl-waiting__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" /><path d="M15 6v12" strokeDasharray="2 2" />
                  </svg>
                </span>
                <div>
                  <p className="fl-waiting__t">Your boarding pass prints here</p>
                  <p className="fl-waiting__d">Select a destination on the board to see its details and board the flight.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
      <TabBar />
    </main>
);
}
