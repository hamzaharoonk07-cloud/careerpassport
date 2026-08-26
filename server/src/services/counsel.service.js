/**
 * The counsellor layer.
 *
 * The engine ranks careers and explains each match on its own. That is not
 * enough to decide with: a list of percentages tells you what scored highest,
 * not whether the result is trustworthy, what you would be choosing between,
 * or what to do on Monday.
 *
 * This reads the ranking as a whole and says the things a person sitting
 * across a desk would say:
 *
 *   - how confident the result actually is, from the gap between first and
 *     second, rather than presenting every result as equally settled
 *   - what separates the top two, in terms of the work rather than the score
 *   - what would change the answer, so the traveller knows what to test
 *   - the first concrete step, taken from the career's own roadmap
 *
 * Everything here is derived from the stored result. Nothing is invented:
 * where the data does not support a statement, the statement is not made.
 */

const AXIS_NAMES = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
};

/** What each axis means in terms of the working day, not the taxonomy. */
const AXIS_WORK = {
  R: 'hands-on work with real systems and equipment',
  I: 'analysis, research and getting to the bottom of things',
  A: 'making things and open-ended creative decisions',
  S: 'working directly with people who need something from you',
  E: 'persuading, leading and carrying commercial risk',
  C: 'precision, structure and work that has to be exactly right',
};

/* Gaps, in percentage points, between the top two matches. */
const CLEAR = 8;
const CLOSE = 3;

/* Below this the ranking is relative rather than a genuine fit. */
const WEAK_FIT = 55;

/**
 * How far apart are the leading matches, and how much should that be trusted?
 */
function readConfidence(matches) {
  const top = matches[0];
  const second = matches[1];
  if (!second) return { level: 'clear', gap: null };

  const gap = top.score - second.score;
  if (gap >= CLEAR) return { level: 'clear', gap };
  if (gap >= CLOSE) return { level: 'leaning', gap };
  return { level: 'unsettled', gap };
}

/**
 * The axis on which the top two careers most disagree.
 *
 * This is what the traveller is actually choosing between — two roles that
 * score alike overall usually differ sharply on one dimension, and naming it
 * turns a tie into a decision someone can make.
 */
function pointOfDifference(a, b) {
  if (!a?.riasec || !b?.riasec) return null;

  let axis = null;
  let delta = 0;
  for (const k of Object.keys(AXIS_NAMES)) {
    const d = Math.abs((a.riasec[k] ?? 0) - (b.riasec[k] ?? 0));
    if (d > delta) { delta = d; axis = k; }
  }
  // Under two points apart on every axis, the roles genuinely are alike and
  // claiming a difference would be inventing one.
  if (!axis || delta < 2) return null;

  const leader = (a.riasec[axis] ?? 0) >= (b.riasec[axis] ?? 0) ? a : b;
  const other = leader === a ? b : a;
  return { axis, delta, leader, other };
}

/**
 * Build the counsel for a completed result.
 *
 * @param {object} profile  riasecVector, dominantAxes, fieldScores
 * @param {Array}  matches  ranked, each { career, score, reasons }
 */
export function buildCounsel(profile, matches) {
  if (!matches?.length) return null;

  const top = matches[0];
  const second = matches[1] || null;
  const { level, gap } = readConfidence(matches);
  const strongest = profile.dominantAxes?.[0];

  const out = {
    confidence: level,
    gap,
    headline: '',
    verdict: '',
    difference: null,
    wouldChangeThis: '',
    firstStep: null,
    honestly: '',
  };

  /* ── How settled is this? ─────────────────────────────────────── */
  if (level === 'clear') {
    out.headline = `${top.career.title} is a clear fit, not a narrow win.`;
    out.verdict =
      `Your answers point at this more than at anything else in the bank — ` +
      `${gap} points clear of the next option. If you were looking for permission to commit to a direction, this is it.`;
  } else if (level === 'leaning') {
    out.headline = `${top.career.title}, but ${second.career.title} is close behind.`;
    out.verdict =
      `Only ${gap} points separate them. That is a lean, not a verdict — ` +
      `treat both as live and let something outside the quiz break the tie.`;
  } else {
    out.headline = `Two directions fit you almost equally.`;
    out.verdict =
      `${top.career.title} and ${second.career.title} are within ${gap === 0 ? 'a point' : `${gap} points`} of each other. ` +
      `The quiz cannot separate them, and pretending otherwise would not help you — the deciding evidence is not in your answers, it is in trying them.`;
  }

  /* ── What are they actually choosing between? ─────────────────── */
  const diff = second ? pointOfDifference(top.career, second.career) : null;
  if (diff) {
    out.difference = {
      axis: diff.axis,
      axisName: AXIS_NAMES[diff.axis],
      leader: diff.leader.title,
      other: diff.other.title,
      text:
        `The real difference is ${AXIS_NAMES[diff.axis]}: ${diff.leader.title} asks for far more ` +
        `${AXIS_WORK[diff.axis]} than ${diff.other.title} does. ` +
        `Which of those two days you would rather have is the actual question.`,
    };
  }

  /* ── What would change the answer? ────────────────────────────── */
  if (strongest) {
    out.wouldChangeThis =
      `This result rests most heavily on your ${AXIS_NAMES[strongest]} score ` +
      `(${profile.riasecVector[strongest]?.toFixed(1)}/10). If that is not really you — if you answered how you would like to be ` +
      `rather than how you are — retake it honestly, because everything downstream moves with it.`;
  }

  /* ── The first concrete step ──────────────────────────────────── */
  const stage = (top.career.roadmap || []).find((s) => s.stage === 1);
  if (stage) {
    out.firstStep = { title: stage.title, detail: stage.detail };
  }

  /* ── Honest caveats ───────────────────────────────────────────── */
  const notes = [];
  if (top.score < WEAK_FIT) {
    notes.push(
      `No career in the bank scored above ${top.score}% for you, so this is the best available match rather than a strong one. ` +
      `That usually means your interests are spread wide, which is not a problem — it just means the shortlist matters more than the winner.`
    );
  }
  if (!top.career.salary || top.career.salary.entry == null) {
    notes.push(`We do not hold verified salary data for this role, so treat any figure you read elsewhere with care.`);
  }
  out.honestly = notes.join(' ');

  return out;
}
