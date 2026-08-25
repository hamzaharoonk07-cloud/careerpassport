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
import { decorateCareer } from '../utils/decorateCareer.js';
import {
  buildUserProfile,
  rankCareers,
  ENGINE_VERSION,
} from '../services/recommendation.service.js';

/** Applies the salary/demand availability flags to every career inside a result. */
const decorateResult = (result) =>
  result && {
    ...result,
    matches: (result.matches || []).map((m) => ({ ...m, career: decorateCareer(m.career) })),
  };

/**
 * Serves the question bank to the client.
 *
 * The scoring weights are stripped. If the client could see that option (a)
 * on question six is worth technology:5, the quiz stops measuring anything —
 * and it would also hand the engine to anyone who opened DevTools.
 */
export const getQuestions = asyncHandler(async (req, res) => {
  const questions = await QuizQuestion.find({ active: true })
    .sort({ order: 1 })
    .populate({ path: 'options', options: { sort: { order: 1 } } })
    .lean();

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

  if (answers.length !== questions.length) {
    throw ApiError.badRequest(
      `Please answer all ${questions.length} questions — we received ${answers.length}.`
    );
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

  if (new Set(answerPairs.map((a) => String(a.question))).size !== questions.length) {
    throw ApiError.badRequest('Each question must be answered exactly once.');
  }

  // ── Score ────────────────────────────────────────────────────────
  const profile = buildUserProfile(chosenOptions, questions);

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
    questionsAnswered: questions.length,
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
