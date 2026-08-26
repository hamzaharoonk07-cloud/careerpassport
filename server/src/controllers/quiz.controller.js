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

export const getQuestions = asyncHandler(async (req, res) => {
  const all = await QuizQuestion.find({ active: true })
    .sort({ order: 1, variant: 1 })
    .populate({ path: 'options', options: { sort: { order: 1 } } })
    .lean();

  // What this traveller saw last time, so it can be avoided.
  const previous = await QuizResult.findOne({ user: req.user._id })
    .sort({ takenAt: -1 })
    .select('askedQuestions')
    .lean();

  const questions = chooseVariants(all, previous?.askedQuestions || []);

  const safe = questions.map((q) => ({
    id: q._id,
    order: q.order,
    prompt: q.prompt,
    dimension: q.dimension,
    helper: q.helper,
    options: q.options.map((o) => ({ id: o._id, key: o.key, label: o.label })),
  }));

  res.json({ ok: true, questions: safe, total: safe.length });
});

/**
 * Scores a completed quiz and stores the result.
 *
 * Expects: { answers: [{ questionId, optionId }] }
 * Every question must be answered — a partial quiz would produce a
 * profile skewed by which questions happened to be skipped.
 */
export const submitQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body;

  const questions = await QuizQuestion.find({ active: true })
    .sort({ order: 1 })
    .populate({ path: 'options', options: { sort: { order: 1 } } })
    .lean();

  if (!questions.length) throw ApiError.badRequest('The quiz is not available right now.');

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
