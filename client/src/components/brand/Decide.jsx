import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const AXES = ['R', 'I', 'A', 'S', 'E', 'C'];

const AXIS_NAMES = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
};

/** What each axis is in terms of a working week, not a taxonomy. */
const AXIS_WORK = {
  R: 'Hands-on, real systems',
  I: 'Analysis and research',
  A: 'Making and open-ended choices',
  S: 'Working directly with people',
  E: 'Leading, selling, carrying risk',
  C: 'Precision and structure',
};

const money = (s) =>
  s?.entry != null ? `${s.currency || 'PKR'} ${Number(s.entry).toLocaleString()}/${s.period || 'month'}` : null;

/**
 * Put the top two side by side.
 *
 * A ranking tells you what scored highest. It does not help you commit,
 * because the thing standing between someone and a decision is not "which
 * is higher" — it is "what am I actually giving up by picking one".
 *
 * So this compares them on the axes where they genuinely disagree, on what
 * they pay, and on how long the route is, and it is explicit that the
 * choice is the reader's. Everything shown comes from the two careers; a
 * row is dropped rather than guessed at when the data is missing.
 */
export function Decide({ first, second }) {
  const rows = useMemo(() => {
    if (!first || !second) return [];

    const a = first.career;
    const b = second.career;

    // Only the axes where the two roles really differ. Listing all six
    // buries the decision in noise — four of them usually agree.
    const axes = AXES
      .map((k) => ({
        k,
        a: a.riasec?.[k] ?? 0,
        b: b.riasec?.[k] ?? 0,
        gap: Math.abs((a.riasec?.[k] ?? 0) - (b.riasec?.[k] ?? 0)),
      }))
      .filter((x) => x.gap >= 2)
      .sort((x, y) => y.gap - x.gap)
      .slice(0, 3);

    return axes;
  }, [first, second]);

  if (!first || !second) return null;

  const a = first.career;
  const b = second.career;
  const payA = money(a.salary);
  const payB = money(b.salary);
  const stagesA = a.roadmap?.length;
  const stagesB = b.roadmap?.length;

  return (
    <section className="decide">
      <header className="decide__head">
        <p className="t-eyebrow">Deciding between them</p>
        <h3 className="decide__h">What you would actually be choosing</h3>
        <p className="decide__lead">
          Scores rank these two. They do not tell you what you give up by picking one, which
          is the part that decides it.
        </p>
      </header>

      <div className="decide__cols">
        <div className="decide__col">
          <span className="decide__pct">{first.score}%</span>
          <h4 className="decide__name">{a.title}</h4>
          <p className="decide__field">{a.field?.name}</p>
        </div>
        <div className="decide__vs" aria-hidden="true">vs</div>
        <div className="decide__col">
          <span className="decide__pct decide__pct--b">{second.score}%</span>
          <h4 className="decide__name">{b.title}</h4>
          <p className="decide__field">{b.field?.name}</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="decide__table">
          <div className="decide__row decide__row--head">
            <span>Where they differ</span>
            <span>{a.title}</span>
            <span>{b.title}</span>
          </div>
          {rows.map((r) => (
            <div className="decide__row" key={r.k}>
              <span className="decide__k">
                {AXIS_NAMES[r.k]}
                <small>{AXIS_WORK[r.k]}</small>
              </span>
              <span className={r.a >= r.b ? 'decide__v decide__v--more' : 'decide__v'}>{r.a}/10</span>
              <span className={r.b > r.a ? 'decide__v decide__v--more' : 'decide__v'}>{r.b}/10</span>
            </div>
          ))}

          {/* Only shown when both sides have a real figure. One-sided pay is
              worse than none — it reads as a comparison when it is not. */}
          {payA && payB && (
            <div className="decide__row">
              <span className="decide__k">Starting pay<small>Indicative, verify locally</small></span>
              <span className="decide__v">{payA}</span>
              <span className="decide__v">{payB}</span>
            </div>
          )}

          {stagesA > 0 && stagesB > 0 && (
            <div className="decide__row">
              <span className="decide__k">Route<small>Stages to get there</small></span>
              <span className="decide__v">{stagesA} stages</span>
              <span className="decide__v">{stagesB} stages</span>
            </div>
          )}
        </div>
      )}

      <div className="decide__actions">
        <Link to={`/careers/${a.slug}`} className="decide__pick">
          Read about {a.title} →
        </Link>
        <Link to={`/careers/${b.slug}`} className="decide__pick">
          Read about {b.title} →
        </Link>
      </div>

      <p className="decide__note">
        Neither one is the answer on its own. The question worth asking is which of those two
        weeks you would rather have for the next ten years — and that is not something a score
        can settle for you.
      </p>
    </section>
  );
}
