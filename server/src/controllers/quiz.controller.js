import mongoose from 'mongoose';
import {
  Career,
  CareerField,
  QuizQuestion,
  QuizOption,
  QuizAnswer,
  QuizResult,
  JOURNEY_STAGE_LIST,
} from '../models/index.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { buildCounsel } from '../services/counsel.service.js';
import { decorateCareer } from '../utils/decorateCareer.js';
import {
  buildUserProfile,
  rankCareers,
  ENGINE_VERSION,
} from '../services/recommendation.service.js';

/**
 * Applies the salary/demand availability flags to every career inside a
 * result, and attaches the counsel.
 *
 * The counsel is computed on read rather than stored. It is a reading of the
 * ranking, not new evidence — deriving it here means an improvement to the
 * advice reaches results that already exist, instead of only new ones.
 */
const decorateResult = (result) => {
  if (!result) return result;

  const matches = (result.matches || []).map((m) => ({
    ...m,
    career: decorateCareer(m.career),
  }));

  const profile = {
    riasecVector: result.riasecVector || {},
    dominantAxes: result.dominantAxes || [],
    fieldScores: result.fieldScores || {},
  };

  return { ...result, matches, counsel: buildCounsel(profile, matches) };
};

/**
 * Serves the question bank to the client.
 *
 * The scoring weights are stripped. If the client could see that option (a)
 * on question six is worth technology:5, the quiz stops measuring anything —
 * and it would also hand the engine to anyone who opened DevTools.
 */
/**
 * Serve one question per slot, avoiding the last attempt's set.
 *
 * The bank holds several phrasings of each measurement. Returning all of
 * them would make the quiz three times longer; returning the same one every
 * time made a retake an identical rerun, which is what a traveller notices
 * first. So each slot contributes exactly one question, and a slot with an
 * unseen variant always prefers it.
 *
 * When every variant in a slot has already been seen the least-recently-used
 * one is served rather than dropping the slot — a missing slot would leave a
 * dimension unmeasured and quietly skew the result.
 */
function chooseVariants(questions, seenIds) {
  const seen = new Set(seenIds.map(String));
  const bySlot = new Map();

  for (const q of questions) {
    if (!bySlot.has(q.order)) bySlot.set(q.order, []);
    bySlot.get(q.order).push(q);
  }

  const chosen = [];
  for (const [, variants] of [...bySlot.entries()].sort((a, b) => a[0] - b[0])) {
    const unseen = variants.filter((v) => !seen.has(String(v._id)));
    const pool = unseen.length ? unseen : variants;
    chosen.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return chosen;
}

/**
 * The seven slots asked of a traveller who is not sure which field they want.
 *
 * Slots 26-31 between them name every one of the twenty fields, so all six
 * are in. The seventh was chosen by simulating a traveller aimed at each of
 * the 94 careers and keeping the base question that most often put that
 * traveller's own field on top (73 of 94) while keeping the six Holland axes
 * evenly measurable. The earlier set, chosen for six fields, managed 33.
 */
export const QUICK_SLOTS = Object.freeze([20, 26, 27, 28, 29, 30, 31]);

/** How many slots the short quiz aims for when the preferred ones are missing. */
const QUICK_TARGET = QUICK_SLOTS.length;

const isQuick = (mode) => mode === 'quick';

/**
 * The questions an attempt may draw on.
 *
 * Two things are enforced here rather than trusted:
 *
 * A question with fewer than two options is never served. The admin panel
 * creates a question first and its options after, so a half-finished
 * question exists in the database for as long as that takes — and one was
 * reaching the quiz as a prompt with nothing to answer.
 *
 * The short quiz prefers QUICK_SLOTS, but a database whose bank was edited
 * or only partly seeded may not have those slots at all. Rather than serving
 * two questions, or none, it tops up from whatever other slots exist, lowest
 * order first, so the same set is chosen on submit as on serve.
 */
const answerable = (questions) => questions.filter((q) => (q.options?.length || 0) >= 2);

const inMode = (questions, mode) => {
  const usable = answerable(questions);
  if (!isQuick(mode)) return usable;

  const slots = [...new Set(usable.map((q) => q.order))].sort((a, b) => a - b);
  const chosen = slots.filter((o) => QUICK_SLOTS.includes(o));
  for (const o of slots) {
    if (chosen.length >= QUICK_TARGET) break;
    if (!chosen.includes(o)) chosen.push(o);
  }
  return usable.filter((q) => chosen.includes(q.order));
};

export const getQuestions = asyncHandler(async (req, res) => {
  const mode = isQuick(req.query.mode) ? 'quick' : 'full';
  const all = inMode(
    await QuizQuestion.find({ active: true })
      .sort({ order: 1, variant: 1 })
      .populate({ path: 'options', options: { sort: { order: 1 } } })
      .lean(),
    mode
  );

  // What this traveller saw last time, so it can be avoided.
  const previous = await QuizResult.findOne({ user: req.user._id })
    .sort({ takenAt: -1 })
    .select('askedQuestions')
    .lean();

  const questions = chooseVariants(all, previous?.askedQuestions || []);

  if (!questions.length) {
    throw ApiError.badRequest(
      'The quiz has no answerable questions yet. An administrator needs to add questions with at least two options.'
    );
  }

  const safe = questions.map((q) => ({
    id: q._id,
    order: q.order,
    prompt: q.prompt,
    dimension: q.dimension,
    helper: q.helper,
    options: q.options.map((o) => ({ id: o._id, key: o.key, label: o.label })),
  }));

  res.json({ ok: true, mode, questions: safe, total: safe.length });
});

/**
 * Scores a completed quiz and stores the result.
 *
 * Expects: { answers: [{ questionId, optionId }] }
 * Every question must be answered — a partial quiz would produce a
 * profile skewed by which questions happened to be skipped.
 */
export const submitQuiz = asyncHandler(async (req, res) => {
  const { answers, mode } = req.body;

  const questions = inMode(
    await QuizQuestion.find({ active: true })
      .sort({ order: 1 })
      .populate({ path: 'options', options: { sort: { order: 1 } } })
      .lean(),
    mode
  );

  if (!questions.length) {
    throw ApiError.badRequest(
      'The quiz has no answerable questions yet. An administrator needs to add questions with at least two options.'
    );
  }

  // Count slots, not rows. The bank holds several phrasings of each
  // measurement and an attempt is served one per slot, so comparing against
  // the whole bank would demand thirty answers for a ten-question quiz.
  const slots = new Set(questions.map((q) => q.order)).size;

  if (answers.length !== slots) {
    throw ApiError.badRequest(
      `Please answer all ${slots} questions — we received ${answers.length}.`
    );
  }

  // One answer per slot, so a client cannot send three variants of the same
  // measurement and have it counted three times.
  const answeredSlots = new Set();
  for (const a of answers) {
    const q = questions.find((x) => String(x._id) === String(a.questionId));
    if (!q) continue;
    if (answeredSlots.has(q.order)) {
      throw ApiError.badRequest('That submission answers the same question twice.');
    }
    answeredSlots.add(q.order);
  }

  // Resolve each answer against the real question bank. An option that does
  // not belong to the question it was submitted for is rejected outright.
  const byQuestionId = new Map(questions.map((q) => [String(q._id), q]));
  const chosenOptions = [];
  const answerPairs = [];

  for (const { questionId, optionId } of answers) {
    const question = byQuestionId.get(String(questionId));
    if (!question) throw ApiError.badRequest('That quiz contained a question we do not recognise.');

    const option = question.options.find((o) => String(o._id) === String(optionId));
    if (!option) throw ApiError.badRequest('One of your answers does not belong to its question.');

    chosenOptions.push(option);
    answerPairs.push({ question: question._id, option: option._id });
  }

  if (new Set(answerPairs.map((a) => String(a.question))).size !== slots) {
    throw ApiError.badRequest('Each question must be answered exactly once.');
  }

  // ── Score ────────────────────────────────────────────────────────
  // Only the questions this attempt actually asked.
  //
  // computeCeilings() derives the maximum reachable score per axis from the
  // questions it is given, and the engine divides by that. Handing it the
  // whole bank — three phrasings of every measurement — would set a ceiling
  // three times higher than anyone could reach and quietly crush every
  // score, with no error to notice.
  const askedIds = new Set(answerPairs.map((a) => String(a.question)));
  const asked = questions.filter((q) => askedIds.has(String(q._id)));

  const profile = buildUserProfile(chosenOptions, asked);

  const chosenField = req.user.selectedField
    ? await CareerField.findById(req.user.selectedField).lean()
    : null;

  const careers = await Career.find({ active: true }).populate('field', 'slug name').lean();
  const matches = rankCareers(profile, careers, chosenField?.slug || null, 8);

  // ── Persist ──────────────────────────────────────────────────────
  const result = await QuizResult.create({
    user: req.user._id,
    selectedField: chosenField?._id || null,
    fieldScores: new Map(Object.entries(profile.fieldScores).map(([k, v]) => [k, Math.round(v)])),
    riasecVector: Object.fromEntries(
      Object.entries(profile.riasecVector).map(([k, v]) => [k, Number(v.toFixed(2))])
    ),
    dominantAxes: profile.dominantAxes,
    matches: matches.map(({ career, score, breakdown, reasons }) => ({ career, score, breakdown, reasons })),
    topMatch: matches[0]?.career || null,
    questionsAnswered: asked.length,
    // Recorded so the next attempt can serve different phrasings.
    askedQuestions: asked.map((q) => q._id),
    engineVersion: ENGINE_VERSION,
  });

  await QuizAnswer.insertMany(
    answerPairs.map((a) => ({ ...a, result: result._id, user: req.user._id }))
  );

  req.user.latestResult = result._id;
  if (JOURNEY_STAGE_LIST.indexOf(req.user.journeyStage) < JOURNEY_STAGE_LIST.indexOf('result')) {
    req.user.journeyStage = 'result';
  }
  await req.user.save();

  const populated = await QuizResult.findById(result._id)
    .populate({ path: 'matches.career', populate: { path: 'field', select: 'slug name icon accent' } })
    .populate('selectedField', 'slug name icon accent')
    .lean();

  res.status(201).json({ ok: true, result: decorateResult(populated) });
});

export const getMyLatestResult = asyncHandler(async (req, res) => {
  const result = await QuizResult.findOne({ user: req.user._id })
    .sort({ takenAt: -1 })
    .populate({ path: 'matches.career', populate: { path: 'field', select: 'slug name icon accent' } })
    .populate('selectedField', 'slug name icon accent')
    .lean();

  if (!result) throw ApiError.notFound('You have not taken the quiz yet.');
  res.json({ ok: true, result: decorateResult(result) });
});

/**
 * The report for one specific destination.
 *
 * Choosing a gate is a decision about a career, so the page that follows has
 * to be about that career. It used to show the latest result's top match
 * instead, which meant flying to DevOps Engineer landed on Game Developer.
 *
 * The chosen career is scored against the traveller's latest profile with the
 * same engine and the same inputs the quiz used, and ranked against the whole
 * bank, so the page can say honestly where it sits. Someone who picked a field
 * without answering any questions still gets the report, with no score.
 */
export const getCareerReport = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').toLowerCase();
  const career = await Career.findOne({ slug, active: true })
    .populate('field', 'slug name icon accent tagline')
    .lean();
  if (!career) throw ApiError.notFound('We do not have a career by that name.');

  const latest = await QuizResult.findOne({ user: req.user._id })
    .sort({ takenAt: -1 })
    .populate('selectedField', 'slug')
    .lean();

  if (!latest) {
    return res.json({ ok: true, career: decorateCareer(career), match: null, best: null });
  }

  const profile = {
    riasecVector: latest.riasecVector || {},
    fieldScores: latest.fieldScores || {},
    dominantAxes: latest.dominantAxes || [],
  };
  const careers = await Career.find({ active: true }).populate('field', 'slug name icon accent').lean();
  const ranked = rankCareers(profile, careers, latest.selectedField?.slug || null, careers.length);

  const index = ranked.findIndex((m) => String(m.career) === String(career._id));
  const mine = ranked[index];
  const top = ranked[0];

  res.json({
    ok: true,
    career: decorateCareer(career),
    match: mine
      ? { score: mine.score, breakdown: mine.breakdown, reasons: mine.reasons, rank: index + 1, of: ranked.length }
      : null,
    best: top && String(top.career) !== String(career._id)
      ? { career: decorateCareer(top.careerDoc), score: top.score }
      : null,
    takenAt: latest.takenAt,
  });
});

export const getMyResults = asyncHandler(async (req, res) => {
  const results = await QuizResult.find({ user: req.user._id })
    .sort({ takenAt: -1 })
    .select('takenAt topMatch matches.score dominantAxes questionsAnswered')
    .populate('topMatch', 'slug title')
    .lean();
  res.json({ ok: true, results });
});

export const getResultById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('No such result.');

  const result = await QuizResult.findById(id)
    .populate({ path: 'matches.career', populate: { path: 'field', select: 'slug name icon accent' } })
    .populate('selectedField', 'slug name icon accent')
    .lean();

  if (!result) throw ApiError.notFound('No such result.');
  // A result belongs to the person who took it.
  if (String(result.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('That result is not yours.');
  }
  res.json({ ok: true, result: decorateResult(result) });
});
