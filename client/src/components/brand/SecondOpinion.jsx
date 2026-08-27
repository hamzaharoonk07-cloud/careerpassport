import { Link } from 'react-router-dom';
/* `.opinion*` is defined in destination.css — see the note in Decide.jsx. */
import '../../styles/destination.css';

const AXIS_NAMES = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
};

/** What a high score on each axis means for the actual working day. */
const AXIS_DAY = {
  R: 'hands-on work with real systems and equipment',
  I: 'long stretches of analysis on your own',
  A: 'open-ended creative decisions with no right answer',
  S: 'people needing something from you, most of the day',
  E: 'persuading, pitching and carrying commercial risk',
  C: 'precision and process where being roughly right is not enough',
};

const AXES = Object.keys(AXIS_NAMES);

/**
 * The question a counsellor asks when you walk past the thing they suggested.
 *
 * Someone browsing a career that is not their match is doing the most
 * interesting thing on the site, and the least supported: they have a reason,
 * and nobody has asked what it is. A ranking that goes quiet the moment you
 * disagree with it is not guidance.
 *
 * So this does not argue. It names the specific gap between this role and
 * their profile, asks whether they already knew that, and says plainly that
 * knowing something the quiz does not is a good enough reason to ignore it.
 */
export function SecondOpinion({ result, career }) {
  if (!result || !career?.riasec) return null;

  const vector = result.riasecVector || {};
  const matches = result.matches || [];
  const top = matches[0];

  // Where this career asks for noticeably more than they scored.
  const stretches = AXES
    .map((k) => ({
      k,
      needs: career.riasec[k] ?? 0,
      has: Number(vector[k] ?? 0),
      gap: (career.riasec[k] ?? 0) - Number(vector[k] ?? 0),
    }))
    .filter((x) => x.needs >= 6 && x.gap >= 2.5)
    .sort((a, b) => b.gap - a.gap);

  // And where it plays to something they scored well on.
  const strengths = AXES
    .map((k) => ({ k, needs: career.riasec[k] ?? 0, has: Number(vector[k] ?? 0) }))
    .filter((x) => x.needs >= 6 && x.has >= 6)
    .sort((a, b) => b.has - a.has);

  const ranked = matches.find((m) => String(m.career?._id) === String(career._id));
  const isTop = top && String(top.career?._id) === String(career._id);

  // Their own match agrees with them — no challenge to make.
  if (isTop) return null;

  return (
    <section className="opinion">
      <p className="opinion__eyebrow">Before you decide</p>
      <h3 className="opinion__h">
        {ranked
          ? `This came ${ranked === matches[0] ? 'first' : `${matches.indexOf(ranked) + 1}${['st', 'nd', 'rd'][matches.indexOf(ranked)] || 'th'}`} for you, at ${ranked.score}%.`
          : 'Your quiz did not put this near the top.'}
      </h3>

      <p className="opinion__lead">
        That is not a reason to drop it. It is a reason to be able to say why you disagree.
      </p>

      {stretches.length > 0 && (
        <div className="opinion__q">
          <span className="opinion__k">The honest question</span>
          <p>
            This role leans on <strong>{AXIS_NAMES[stretches[0].k]}</strong> — {AXIS_DAY[stretches[0].k]} — and
            scores {stretches[0].needs}/10 on it. You came out at {stretches[0].has.toFixed(1)}/10.
          </p>
          <p className="opinion__ask">
            Is that a part of the job you are looking forward to, or one you are hoping is smaller
            than it sounds? If it is the second, that is worth knowing now rather than two years in.
          </p>
        </div>
      )}

      {strengths.length > 0 && (
        <div className="opinion__q">
          <span className="opinion__k">What does line up</span>
          <p>
            It also asks for <strong>{AXIS_NAMES[strengths[0].k]}</strong>, where you scored{' '}
            {strengths[0].has.toFixed(1)}/10. That part is not a stretch.
          </p>
        </div>
      )}

      {top && (
        <div className="opinion__q">
          <span className="opinion__k">Worth comparing</span>
          <p>
            Your strongest match was <Link to={`/careers/${top.career.slug}`}>{top.career.title}</Link>{' '}
            at {top.score}%. If you already know why this one suits you better, that is a real answer —
            the quiz measured ten questions, and you have the rest of the information.
          </p>
        </div>
      )}

      <p className="opinion__foot">
        Nobody here knows your circumstances, what you can afford to study, or what you have already
        tried. Treat this as a second opinion, not a verdict.
      </p>
    </section>
  );
}
