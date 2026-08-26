import { FIELD_KEYS, RIASEC_KEYS } from '../models/QuizOption.js';

export const ENGINE_VERSION = '1.0';

/**
 * ============================================================
 * PathSeeker recommendation engine
 * ============================================================
 *
 * Deterministic. No randomness, no external API, no black box.
 * The same answers always produce the same result, and every
 * number shown to the user can be traced back to a rule here.
 *
 * Three inputs, three weights:
 *
 *   score = 0.60 × riasecFit          Holland-code similarity
 *         + 0.30 × fieldFit           how strongly the quiz points at this career's field
 *         + 0.10 × chosenFieldBonus   the field the user picked on the train
 *
 * Deliberately NOT included: work-style fit. The docs proposed it,
 * but this quiz does not actually collect a work-style preference,
 * and scoring against data we never gathered would be inventing a
 * number. Work style is displayed on the career page as information,
 * not used as a scoring input.
 */
export const WEIGHTS = Object.freeze({
  riasec: 0.6,
  field: 0.3,
  chosenField: 0.1,
});

/**
 * Cosine similarity between two all-positive six-dimensional vectors
 * rarely drops below ~0.55, so raw cosine compresses every career into
 * a narrow band and stops discriminating. We rescale the usable range
 * onto 0–1 so differences between careers are visible.
 */
const COSINE_FLOOR = 0.55;

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of RIASEC_KEYS) {
    const x = a[k] || 0;
    const y = b[k] || 0;
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * The maximum score each axis and each field could possibly reach,
 * given this exact question bank.
 *
 * This matters. Our questions do not offer equal weight to every axis —
 * Realistic is reachable up to ~20 points while Investigative reaches ~44.
 * Without normalising, every user would look low on Realistic and
 * R-dominant careers would never match anyone. Dividing by what was
 * actually reachable makes the axes comparable.
 */
export function computeCeilings(questions) {
  const riasec = Object.fromEntries(RIASEC_KEYS.map((k) => [k, 0]));
  const field = Object.fromEntries(FIELD_KEYS.map((k) => [k, 0]));

  for (const q of questions) {
    const perAxis = Object.fromEntries(RIASEC_KEYS.map((k) => [k, 0]));
    const perField = Object.fromEntries(FIELD_KEYS.map((k) => [k, 0]));

    for (const opt of q.options) {
      for (const k of RIASEC_KEYS) perAxis[k] = Math.max(perAxis[k], opt.riasec?.[k] || 0);
      for (const k of FIELD_KEYS) perField[k] = Math.max(perField[k], opt.fieldWeights?.[k] || 0);
    }
    for (const k of RIASEC_KEYS) riasec[k] += perAxis[k];
    for (const k of FIELD_KEYS) field[k] += perField[k];
  }
  return { riasec, field };
}

/**
 * Adds up the chosen options into a raw user profile, then normalises
 * each axis against its ceiling.
 *
 * @param {Array} chosenOptions - the QuizOption documents the user selected
 * @param {Array} questions     - the full active question bank (for ceilings)
 * @returns {{ riasecVector, riasecRaw, fieldScores, fieldRaw, dominantAxes }}
 *   riasecVector is on a 0–10 scale, matching Career.riasec.
 *   fieldScores are 0–100 percentages of what that field could have scored.
 */
export function buildUserProfile(chosenOptions, questions) {
  const riasecRaw = Object.fromEntries(RIASEC_KEYS.map((k) => [k, 0]));
  const fieldRaw = Object.fromEntries(FIELD_KEYS.map((k) => [k, 0]));

  for (const opt of chosenOptions) {
    for (const k of RIASEC_KEYS) riasecRaw[k] += opt.riasec?.[k] || 0;
    for (const k of FIELD_KEYS) fieldRaw[k] += opt.fieldWeights?.[k] || 0;
  }

  const ceilings = computeCeilings(questions);

  const riasecVector = Object.fromEntries(
    RIASEC_KEYS.map((k) => [k, ceilings.riasec[k] ? (riasecRaw[k] / ceilings.riasec[k]) * 10 : 0])
  );
  const fieldScores = Object.fromEntries(
    FIELD_KEYS.map((k) => [k, ceilings.field[k] ? (fieldRaw[k] / ceilings.field[k]) * 100 : 0])
  );

  const dominantAxes = [...RIASEC_KEYS]
    .sort((a, b) => riasecVector[b] - riasecVector[a])
    .slice(0, 2);

  return { riasecVector, riasecRaw, fieldScores, fieldRaw, dominantAxes, ceilings };
}

const AXIS_NAMES = {
  R: 'Realistic',
  I: 'Investigative',
  A: 'Artistic',
  S: 'Social',
  E: 'Enterprising',
  C: 'Conventional',
};

const AXIS_PHRASES = {
  R: 'building and working with real things',
  I: 'analysing problems and finding out why',
  A: 'creating and expressing original work',
  S: 'working directly with and for people',
  E: 'leading, persuading and owning outcomes',
  C: 'precision, structure and getting details right',
};

/**
 * Builds the sentences shown under the match percentage.
 *
 * Every sentence is generated from a number that actually contributed
 * to the score. Nothing here is generic encouragement.
 */
function buildReasons({ profile, career, fieldSlug, isChosenField, riasecFit, fieldFit }) {
  const reasons = [];

  // 1. Shared dominant Holland axes — the largest single contributor.
  const careerTop = [...RIASEC_KEYS].sort((a, b) => career.riasec[b] - career.riasec[a]).slice(0, 2);
  const shared = profile.dominantAxes.filter((a) => careerTop.includes(a));

  if (shared.length === 2) {
    reasons.push(
      `Your two strongest traits — ${AXIS_NAMES[shared[0]]} and ${AXIS_NAMES[shared[1]]} — are exactly the pair this role is built on.`
    );
  } else if (shared.length === 1) {
    const a = shared[0];
    reasons.push(
      `You scored highest on ${AXIS_NAMES[a]} (${profile.riasecVector[a].toFixed(1)}/10), and this role leans on ${AXIS_PHRASES[a]}.`
    );
  } else {
    reasons.push(
      `This role is dominated by ${AXIS_NAMES[careerTop[0]]}, where you scored ${profile.riasecVector[careerTop[0]].toFixed(1)}/10 — a partial rather than a natural fit.`
    );
  }

  // 2. Field affinity, straight from the quiz.
  const fieldPct = Math.round(profile.fieldScores[fieldSlug] || 0);
  if (fieldPct >= 60) {
    reasons.push(`Your answers pointed at ${fieldSlug} on ${fieldPct}% of the available signal — your clearest direction.`);
  } else if (fieldPct >= 35) {
    reasons.push(`${fieldPct}% of your answers pointed toward ${fieldSlug}, enough to make this a genuine option rather than a stretch.`);
  } else {
    reasons.push(`Only ${fieldPct}% of your answers pointed toward ${fieldSlug}, so this match rests mainly on your trait profile.`);
  }

  // 3. Whether they chose this field themselves on the train.
  if (isChosenField) {
    reasons.push(`You chose this field yourself, and your answers backed that choice rather than contradicting it.`);
  }

  // 4. Honest note when the trait fit is doing the heavy lifting.
  if (riasecFit >= 0.75 && fieldFit < 0.4) {
    reasons.push(`Worth noting: you fit how this work feels more than you fit the subject matter. That is often worth exploring.`);
  }

  return reasons;
}

/**
 * Ranks every career against a user profile.
 *
 * @param {object} profile        - from buildUserProfile()
 * @param {Array}  careers        - Career documents, with `field` populated
 * @param {string|null} chosenFieldSlug - the field selected on the train, if any
 * @param {number} limit
 * @returns {Array} matches, highest score first
 */
export function rankCareers(profile, careers, chosenFieldSlug = null, limit = 8) {
  const scored = careers.map((career) => {
    const fieldSlug = career.field?.slug || null;

    const cos = cosineSimilarity(profile.riasecVector, career.riasec);
    const riasecFit = clamp((cos - COSINE_FLOOR) / (1 - COSINE_FLOOR));
    const fieldFit = clamp((profile.fieldScores[fieldSlug] || 0) / 100);
    const isChosenField = Boolean(chosenFieldSlug && fieldSlug === chosenFieldSlug);

    // When the traveller never picked a field, the chosen-field term cannot
    // be earned by anybody, so leaving it in the denominator would take ten
    // points off every career alike. The order would survive but the numbers
    // would not: a 78% match would print as 68%, and a percentage is read as
    // a statement about fit, not as a rank. Drop the term and share its
    // weight between the two that were actually measured.
    const raw = chosenFieldSlug
      ? WEIGHTS.riasec * riasecFit +
        WEIGHTS.field * fieldFit +
        WEIGHTS.chosenField * (isChosenField ? 1 : 0)
      : (WEIGHTS.riasec * riasecFit + WEIGHTS.field * fieldFit) /
        (WEIGHTS.riasec + WEIGHTS.field);

    return {
      career: career._id,
      careerDoc: career,
      score: Math.round(clamp(raw) * 100),
      breakdown: {
        riasec: Math.round(riasecFit * 100),
        field: Math.round(fieldFit * 100),
        workStyle: 0, // not scored — see the note at the top of this file
      },
      reasons: buildReasons({ profile, career, fieldSlug, isChosenField, riasecFit, fieldFit }),
    };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.careerDoc.title.localeCompare(b.careerDoc.title))
    .slice(0, limit);
}

export const _internals = { cosineSimilarity, clamp, COSINE_FLOOR };
